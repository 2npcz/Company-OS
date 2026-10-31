import fs from 'fs';
import path from 'path';

export interface QueuedAttendanceEvent {
  id: string;
  deviceId?: string;
  deviceUserId: string;
  eventTimestamp: string;
  eventType: string;
  verificationMethod: string;
  source: string;
  externalEventId: string;
  rawPayload: Record<string, any>;
  enqueuedAt: string;
  retryCount: number;
}

export class LocalQueue {
  private queueFilePath: string;

  constructor(storageDir?: string) {
    const dir = storageDir || path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.queueFilePath = path.join(dir, 'attendance_queue.json');
    if (!fs.existsSync(this.queueFilePath)) {
      fs.writeFileSync(this.queueFilePath, JSON.stringify([]));
    }
  }

  readAll(): QueuedAttendanceEvent[] {
    try {
      const data = fs.readFileSync(this.queueFilePath, 'utf8');
      return JSON.parse(data) || [];
    } catch (e) {
      console.error('[LocalQueue] Failed to read queue file:', e);
      return [];
    }
  }

  enqueue(events: QueuedAttendanceEvent[]): void {
    if (events.length === 0) return;
    const existing = this.readAll();
    const existingIds = new Set(existing.map((e) => e.externalEventId));

    const newItems = events.filter((e) => !existingIds.has(e.externalEventId));
    if (newItems.length > 0) {
      const updated = [...existing, ...newItems];
      this.writeAtomic(updated);
    }
  }

  remove(externalEventIds: string[]): void {
    if (externalEventIds.length === 0) return;
    const idsToRemove = new Set(externalEventIds);
    const existing = this.readAll();
    const remaining = existing.filter((e) => !idsToRemove.has(e.externalEventId));
    this.writeAtomic(remaining);
  }

  incrementRetry(externalEventIds: string[]): void {
    const idSet = new Set(externalEventIds);
    const existing = this.readAll();
    const updated = existing.map((e) => {
      if (idSet.has(e.externalEventId)) {
        return { ...e, retryCount: (e.retryCount || 0) + 1 };
      }
      return e;
    });
    this.writeAtomic(updated);
  }

  size(): number {
    return this.readAll().length;
  }

  private writeAtomic(data: QueuedAttendanceEvent[]): void {
    const tempFile = `${this.queueFilePath}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, this.queueFilePath);
  }
}
