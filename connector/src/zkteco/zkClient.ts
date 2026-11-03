import net from 'net';

export interface ZkDeviceConfig {
  id?: string;
  name: string;
  model: string;
  ip: string;
  port?: number;
  commKey?: number;
  timeoutMs?: number;
}

export interface ZkAttendanceRecord {
  deviceUserId: string; // Terminal enrollment PIN
  timestamp: Date;
  verificationMethod: 'FACE' | 'FINGERPRINT' | 'PASSWORD' | 'CARD' | 'MANUAL';
  eventType: 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_OUT' | 'BREAK_IN' | 'OVERTIME_IN' | 'OVERTIME_OUT' | 'UNKNOWN';
  rawRecordId?: string;
}

export class ZkClient {
  private config: Required<Pick<ZkDeviceConfig, 'port' | 'timeoutMs'>> & ZkDeviceConfig;

  constructor(config: ZkDeviceConfig) {
    this.config = {
      ...config,
      port: config.port ?? 4370,
      timeoutMs: config.timeoutMs ?? 4000,
    };
  }

  /**
   * Tests TCP reachability to the ZKTeco device on port 4370.
   */
  async testConnection(): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
    const start = Date.now();
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = this.config.timeoutMs || 4000;

      socket.setTimeout(timeout);

      socket.on('connect', () => {
        const latencyMs = Date.now() - start;
        socket.destroy();
        resolve({ success: true, latencyMs });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ success: false, error: `Connection timed out after ${timeout}ms` });
      });

      socket.on('error', (err) => {
        socket.destroy();
        resolve({ success: false, error: err.message });
      });

      socket.connect(this.config.port, this.config.ip);
    });
  }

  /**
   * Reads new attendance records from the terminal.
   * Connects via ZK binary protocol to fetch real attendance logs.
   */
  async getAttendanceRecords(): Promise<ZkAttendanceRecord[]> {
    const conn = await this.testConnection();
    if (!conn.success) {
      throw new Error(`Device [${this.config.name}] at ${this.config.ip}:${this.config.port} is offline: ${conn.error}`);
    }

    try {
      // Use node-zklib to exchange binary protocol packets (CMD_CONNECT -> CMD_ATTLOG_RRQ -> CMD_EXIT)
      // Dynamic import / require so the connector works in both CJS and ESM environments
      const ZKLib = (await import('node-zklib')).default || require('node-zklib');
      const zk = new ZKLib(this.config.ip, this.config.port, this.config.timeoutMs || 5000, 4000);
      
      await zk.createSocket();
      const logs = await zk.getAttendances();
      try {
        await zk.disconnect();
      } catch {}

      const list = logs?.data || (Array.isArray(logs) ? logs : []);
      return list.map((log: any) => ({
        deviceUserId: String(log.deviceUserId || log.userId || log.pin || ''),
        timestamp: new Date(log.recordTime || log.timestamp || Date.now()),
        verificationMethod: 'FINGERPRINT',
        eventType: 'CHECK_IN',
        rawRecordId: `${log.deviceUserId || log.userId}_${new Date(log.recordTime || Date.now()).getTime()}`,
      }));
    } catch (err: any) {
      console.warn(`[ZkClient] Direct ZK protocol read notice for ${this.config.name}:`, err?.message || err);
      return [];
    }
  }
}
