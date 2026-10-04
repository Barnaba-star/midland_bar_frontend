import { Injectable } from '@angular/core';

interface Entry {
  name: string;
  /** When it was last written (ms) - entries a week old are dropped. */
  at: number;
}

/**
 * A nickname for an open bill ("mzee wa kofia nyekundu") so whoever serves
 * it remembers the customer. Kept only in this browser - never sent to the
 * backend, never in the database - and gone once the bill is paid, deleted,
 * or no longer open.
 */
@Injectable({ providedIn: 'root' })
export class BillNicknames {
  private static readonly KEY = 'bar.billNicknames';
  private static readonly MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  private entries: Record<string, Entry> = this.read();

  get(billUid: string | null | undefined): string {
    return (billUid && this.entries[billUid]?.name) || '';
  }

  set(billUid: string | null | undefined, name: string): void {
    if (!billUid) {
      return;
    }
    const trimmed = (name || '').slice(0, 40);
    if (trimmed.trim()) {
      this.entries[billUid] = { name: trimmed, at: Date.now() };
    } else {
      delete this.entries[billUid];
    }
    this.write();
  }

  /** The bill was paid or deleted. */
  remove(billUid: string | null | undefined): void {
    if (billUid && this.entries[billUid]) {
      delete this.entries[billUid];
      this.write();
    }
  }

  /** Keep only the bills still open - given the branch's whole open list. */
  keepOnly(openUids: (string | undefined)[]): void {
    const open = new Set(openUids.filter(Boolean));
    let changed = false;
    for (const uid of Object.keys(this.entries)) {
      if (!open.has(uid)) {
        delete this.entries[uid];
        changed = true;
      }
    }
    if (changed) {
      this.write();
    }
  }

  private read(): Record<string, Entry> {
    try {
      const raw = JSON.parse(localStorage.getItem(BillNicknames.KEY) || '{}') as Record<string, Entry>;
      const cutoff = Date.now() - BillNicknames.MAX_AGE_MS;
      const fresh: Record<string, Entry> = {};
      for (const [uid, e] of Object.entries(raw ?? {})) {
        if (e && typeof e.name === 'string' && (e.at ?? 0) >= cutoff) {
          fresh[uid] = e;
        }
      }
      return fresh;
    } catch {
      return {};
    }
  }

  private write(): void {
    try {
      localStorage.setItem(BillNicknames.KEY, JSON.stringify(this.entries));
    } catch {
      // Private window or storage off: the nickname lasts until the page reloads.
    }
  }
}
