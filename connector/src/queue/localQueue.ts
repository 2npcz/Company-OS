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
  private syncedFilePath: string;
  private syncedSet: Set<string>;

  constructor(storageDir?: string) {
    const dir = storageDir || path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.queueFilePath = path.join(dir, 'attendance_queue.json');
    if (!fs.existsSync(this.queueFilePath)) {
      fs.writeFileSync(this.queueFilePath, JSON.stringify([]));
    }

    this.syncedFilePath = path.join(dir, 'synced_ids.json');
    if (!fs.existsSync(this.syncedFilePath)) {
      fs.writeFileSync(this.syncedFilePath, JSON.stringify([]));
    }

    this.syncedSet = new Set<string>();
    try {
      const raw = fs.readFileSync(this.syncedFilePath, 'utf8');
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        this.syncedSet = new Set(arr);
      }
    } catch {
      this.syncedSet = new Set<string>();
    }
  }

  isSynced(externalEventId: string): boolean {
    return this.syncedSet.has(externalEventId);
  }

  getSyncedCount(): number {
    return this.syncedSet.size;
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

  enqueue(events: QueuedAttendanceEvent[]): number {
    if (events.length === 0) return 0;
    const existing = this.readAll();
    const existingIds = new Set(existing.map((e) => e.externalEventId));

    const newItems = events.filter(
      (e) => !existingIds.has(e.externalEventId) && !this.syncedSet.has(e.externalEventId)
    );

    if (newItems.length > 0) {
      const updated = [...existing, ...newItems];
      this.writeAtomic(this.queueFilePath, updated);
    }

    return newItems.length;
  }

  markSynced(externalEventIds: string[]): void {
    if (externalEventIds.length === 0) return;
    for (const id of externalEventIds) {
      this.syncedSet.add(id);
    }
    this.writeAtomic(this.syncedFilePath, Array.from(this.syncedSet));
    this.remove(externalEventIds);
  }

  resetSynced(): void {
    this.syncedSet.clear();
    this.writeAtomic(this.syncedFilePath, []);
  }

  remove(externalEventIds: string[]): void {
    if (externalEventIds.length === 0) return;
    const idsToRemove = new Set(externalEventIds);
    const existing = this.readAll();
    const remaining = existing.filter((e) => !idsToRemove.has(e.externalEventId));
    this.writeAtomic(this.queueFilePath, remaining);
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
    this.writeAtomic(this.queueFilePath, updated);
  }

  size(): number {
    return this.readAll().length;
  }

  private writeAtomic(filePath: string, data: any): void {
    const tempFile = `${filePath}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, filePath);
  }
}
