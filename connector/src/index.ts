import fs from 'fs';
import path from 'path';
import { ZkClient, ZkDeviceConfig } from './zkteco/zkClient.js';
import { LocalQueue, QueuedAttendanceEvent } from './queue/localQueue.js';
import { SupabaseUploader } from './sync/uploader.js';

interface ConnectorConfigFile {
  supabaseUrl: string;
  supabaseKey: string;
  organizationId: string;
  syncIntervalSeconds?: number;
  heartbeatIntervalSeconds?: number;
  devices: ZkDeviceConfig[];
}

function loadConfig(): ConnectorConfigFile {
  const configPath = path.resolve(process.cwd(), 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(raw);
    } catch (e) {
      console.error('[Connector] Error parsing config.json:', e);
    }
  }

  // Fallback to environment variables
  return {
    supabaseUrl: process.env.SUPABASE_URL || 'https://vxxhziyepxddxiptfqab.supabase.co',
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '',
    organizationId: process.env.ORGANIZATION_ID || '',
    syncIntervalSeconds: 30,
    heartbeatIntervalSeconds: 60,
    devices: [],
  };
}

async function main() {
  const args = process.argv.slice(2);
  const isTestConn = args.includes('--test-connection');
  const isSyncNow = args.includes('--sync-now');

  console.log('====================================================');
  console.log('Company OS — ZKTeco Local Attendance Connector v1.0');
  console.log('====================================================');

  const config = loadConfig();
  if (!config.supabaseUrl || !config.supabaseKey) {
    console.warn('[Connector] Supabase credentials not found. Set in config.json or environment.');
  }

  const queue = new LocalQueue();
  const uploader = new SupabaseUploader({
    supabaseUrl: config.supabaseUrl,
    supabaseKey: config.supabaseKey,
    organizationId: config.organizationId,
  });

  console.log(`[Connector] Configured for ${config.devices.length} device(s).`);
  console.log(`[Connector] Local persistent queue size: ${queue.size()} pending event(s).`);

  // Handle --test-connection CLI flag
  if (isTestConn) {
    console.log('\n--- Testing TCP Connectivity to Configured Terminals ---');
    for (const dev of config.devices) {
      const client = new ZkClient(dev);
      const res = await client.testConnection();
      if (res.success) {
        console.log(`[PASS] ${dev.name} (${dev.ip}:${dev.port}) -> Connected in ${res.latencyMs}ms`);
      } else {
        console.log(`[FAIL] ${dev.name} (${dev.ip}:${dev.port}) -> ${res.error}`);
      }
    }
    process.exit(0);
  }

  // Sync Routine
  async function performSyncPass() {
    console.log(`\n[${new Date().toLocaleTimeString()}] Running Attendance Sync Cycle...`);

    for (const dev of config.devices) {
      const client = new ZkClient(dev);
      const connTest = await client.testConnection();

      if (connTest.success) {
        console.log(`[Connector] ${dev.name} is ONLINE (${connTest.latencyMs}ms)`);
        if (dev.id) {
          await uploader.sendHeartbeat(dev.id, 'ONLINE');
        }

        try {
          const records = await client.getAttendanceRecords();
          console.log(`[Connector] Retrieved ${records.length} new punch event(s) from ${dev.name}`);

          if (records.length > 0) {
            const queuedItems: QueuedAttendanceEvent[] = records.map((r, idx) => ({
              id: `${dev.id || 'dev'}_${r.deviceUserId}_${r.timestamp.getTime()}_${idx}`,
              deviceId: dev.id,
              deviceUserId: r.deviceUserId,
              eventTimestamp: r.timestamp.toISOString(),
              eventType: r.eventType,
              verificationMethod: r.verificationMethod,
              source: 'LOCAL_CONNECTOR',
              externalEventId: r.rawRecordId || `${dev.id || 'dev'}_${r.deviceUserId}_${r.timestamp.getTime()}`,
              rawPayload: { terminalIp: dev.ip, model: dev.model },
              enqueuedAt: new Date().toISOString(),
              retryCount: 0,
            }));

            queue.enqueue(queuedItems);
          }
        } catch (err: any) {
          console.error(`[Connector] Error pulling events from ${dev.name}:`, err.message);
        }
      } else {
        console.warn(`[Connector] ${dev.name} (${dev.ip}:${dev.port}) is OFFLINE: ${connTest.error}`);
        if (dev.id) {
          await uploader.sendHeartbeat(dev.id, 'OFFLINE');
        }
      }
    }

    // Flush local queue to Supabase
    const pending = queue.readAll();
    if (pending.length > 0) {
      console.log(`[Connector] Flushing ${pending.length} event(s) from local queue to Supabase...`);
      const uploadRes = await uploader.uploadEvents(pending);

      if (uploadRes.uploadedIds.length > 0) {
        console.log(`[Connector] Successfully uploaded ${uploadRes.uploadedIds.length} event(s).`);
        queue.remove(uploadRes.uploadedIds);
      }
      if (uploadRes.failedIds.length > 0) {
        console.warn(`[Connector] ${uploadRes.failedIds.length} event(s) failed upload. Kept in queue for next retry.`);
        queue.incrementRetry(uploadRes.failedIds);
      }
    } else {
      console.log('[Connector] Local queue empty. All punches in sync.');
    }
  }

  // Initial Run
  await performSyncPass();

  if (isSyncNow) {
    console.log('[Connector] --sync-now finished.');
    process.exit(0);
  }

  // Start periodic polling
  const syncIntervalMs = (config.syncIntervalSeconds || 30) * 1000;
  console.log(`\n[Connector] Daemon active. Polling devices every ${config.syncIntervalSeconds || 30}s...`);
  const interval = setInterval(performSyncPass, syncIntervalMs);

  const cleanup = () => {
    console.log('\n[Connector] Stopping daemon gracefully...');
    clearInterval(interval);
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main().catch((e) => {
  console.error('[Connector] Fatal Error:', e);
  process.exit(1);
});
