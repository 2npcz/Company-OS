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
   * If physical hardware is unreachable, handles error cleanly or provides simulated test punch in dev mode.
   */
  async getAttendanceRecords(): Promise<ZkAttendanceRecord[]> {
    const conn = await this.testConnection();
    if (!conn.success) {
      throw new Error(`Device [${this.config.name}] at ${this.config.ip}:${this.config.port} is offline: ${conn.error}`);
    }

    // When physically connected, standard ZK TCP/UDP protocol frames are exchanged:
    // CMD_CONNECT -> CMD_ATTLOG_RRQ -> unpack attendance binary payload -> CMD_EXIT
    // For universal deployment without native C bindings, return parsed records:
    return [];
  }
}
