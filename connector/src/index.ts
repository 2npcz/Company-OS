import fs from 'fs';
import path from 'path';
import { ZkClient, ZkDeviceConfig } from './zkteco/zkClient.js';
import { LocalQueue, QueuedAttendanceEvent } from './queue/localQueue.js';
import { SupabaseUploader } from './sync/uploader.js';

interface ConnectorConfigFile {
  supabaseUrl: string;
  supabaseKey: string;
  organizationId: string;
  email?: string;
  password?: string;
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

function saveConfig(config: ConnectorConfigFile): void {
  try {
    const configPath = path.resolve(process.cwd(), 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log('[Connector] Successfully updated config.json with discovered device parameters.');
  } catch (e: any) {
    console.warn('[Connector] Failed to write config.json:', e.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isTestConn = args.includes('--test-connection');
  const isSyncNow = args.includes('--sync-now');
  const isResyncAll = args.includes('--resync-all');

  console.log('====================================================');
  console.log('Company OS — ZKTeco Local Attendance Connector v2.0');
  console.log('====================================================');

  const config = loadConfig();
  if (!config.supabaseUrl || !config.supabaseKey) {
    console.warn('[Connector] Supabase credentials not found. Set in config.json or environment.');
  }

  const queue = new LocalQueue();
  if (isResyncAll) {
    console.log('[Connector] --resync-all requested: Resetting local synced cache...');
    queue.resetSynced();
  }

  const uploader = new SupabaseUploader({
    supabaseUrl: config.supabaseUrl,
    supabaseKey: config.supabaseKey,
    organizationId: config.organizationId,
    email: config.email,
    password: config.password,
  });
  await uploader.authenticate();

  console.log(`[Connector] Configured for ${config.devices.length} device(s).`);
  console.log(`[Connector] Local persistent queue: ${queue.size()} pending, ${queue.getSyncedCount()} already synced.`);

  // Handle --test-connection CLI flag
  if (isTestConn) {
    console.log('\n--- Testing TCP Connectivity to Configured Terminals ---');
    for (const dev of config.devices) {
      const client = new ZkClient(dev);
      let res = await client.testConnection();
      if (!res.success) {
        console.log(`[Connector] Probing local subnet for ${dev.name}...`);
        const disc = await ZkClient.discoverDevice(dev.ip, dev.port);
        if (disc) {
          console.log(`[Connector] Auto-discovered ${dev.name} at ${disc}!`);
          dev.ip = disc;
          saveConfig(config);
          res = await client.testConnection(disc);
        }
      }
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
      let connTest = await client.testConnection();

      // If offline, attempt fast subnet auto-discovery
      if (!connTest.success) {
        console.warn(`[Connector] ${dev.name} (${dev.ip}:${dev.port}) unreachable (${connTest.error}). Initiating subnet auto-discovery...`);
        const discoveredIp = await ZkClient.discoverDevice(dev.ip, dev.port);
        if (discoveredIp && discoveredIp !== dev.ip) {
          console.log(`[Connector] Auto-discovered ${dev.name} at new IP: ${discoveredIp}! Healing configuration...`);
          dev.ip = discoveredIp;
          client.config.ip = discoveredIp;
          saveConfig(config);

          if (dev.id) {
            await uploader.updateDeviceIp(dev.id, discoveredIp);
          }

          connTest = await client.testConnection();
        }
      }

      if (connTest.success) {
        console.log(`[Connector] ${dev.name} is ONLINE (${connTest.latencyMs}ms at ${dev.ip})`);
        if (dev.id) {
          await uploader.sendHeartbeat(dev.id, 'ONLINE');
        }

        try {
          const records = await client.getAttendanceRecords();

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

            const newlyEnqueued = queue.enqueue(queuedItems);
            if (newlyEnqueued > 0) {
              console.log(`[Connector] Retrieved ${records.length} records (${newlyEnqueued} new punch event(s) to upload) from ${dev.name}`);
            } else {
              console.log(`[Connector] Terminal buffer: ${records.length} punches (all up to date).`);
            }
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
        queue.markSynced(uploadRes.uploadedIds);
      }
      if (uploadRes.failedIds.length > 0) {
        console.warn(`[Connector] ${uploadRes.failedIds.length} event(s) failed upload. Kept in queue for next retry.`);
        queue.incrementRetry(uploadRes.failedIds);
      }
    }

    // Always run session catch-up to ensure daily consolidated attendance records match raw events
    await uploader.processSessions();
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
