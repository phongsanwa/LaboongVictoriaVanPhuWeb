import { Injectable } from '@angular/core';

export interface INativeStorageInfo {
  currentSize: number;
  limitSize: number;
}

/** Driver interface (nativeStorage | localStorage) */
interface IStorageDriver {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  getStorageInfo(): INativeStorageInfo;
}

/** Hộp cache có TTL/migration*/
export interface ICacheBox<T> {
  version: number;    // schema version
  savedAt: number;    // timestamp ms
  ttl?: number;       // optional ms
  data: T;
}

@Injectable({ providedIn: 'root' })
export class ZmaNativeStorageService {
  private namespace = '';
  private readonly INDEX_KEY = '__index__';
  private readonly storageDriver: IStorageDriver = this.resolveDriver();

  /** Tuỳ chọn: đặt namespace) */
  setNamespace(ns: string) {
    this.namespace = (ns || '').trim();
  }

  // ───── API cơ bản (tương thích LocalStorageService cũ) ─────

  /** Lấy chuỗi thô, không parse JSON */
  getPure(key: string): string {
    const val = this.storageDriver.getItem(this.ns(key));
    return val == null || val === 'undefined' ? '' : val;
    // key ví dụ: 'product:detail:9159850'
  }

  /** Ghi chuỗi thô, không stringify JSON */
  setPure(key: string, value: unknown): void {
    const full = this.ns(key);
    this.storageDriver.setItem(full, String(value ?? ''));
    this.indexAdd(full);
  }

  /** Lấy JSON, mặc định trả {} để tương thích code cũ */
  get<T = unknown>(key: string, fallback: T = {} as T): T {
    const raw = this.storageDriver.getItem(this.ns(key));
    if (raw == null || raw === 'undefined') return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  /** Ghi JSON */
  set(key: string, value: unknown): void {
    const full = this.ns(key);
    const s = this.safeStringify(value);
    this.storageDriver.setItem(full, s);
    this.indexAdd(full);
  }

  /** Kiểm tra tồn tại key */
  has(key: string): boolean {
    return this.storageDriver.getItem(this.ns(key)) != null;
  }

  /** Xoá 1 key */
  remove(key: string): void {
    const full = this.ns(key);
    this.storageDriver.removeItem(full);
    this.indexRemove(full);
  }

  /** Xoá toàn bộ */
  clear(): void {
    this.storageDriver.clear();
    this.storageDriver.removeItem(this.indexKey());
  }

  /** Xoá theo prefix (dựa vào index nội bộ) */
  clearByPrefix(prefix: string): void {
    const fullPrefix = this.ns(prefix, false);
    const list = this.indexList();

    const targets = list.filter(k => k.startsWith(fullPrefix));
    for (const k of targets) this.storageDriver.removeItem(k);

    const remain = list.filter(k => !k.startsWith(fullPrefix));
    this.writeIndex(remain);
  }

  /** Thông tin dung lượng */
  getInfo(): INativeStorageInfo {
    return this.storageDriver.getStorageInfo();
  }

  // ───── Tiện ích Box cache (dùng khi cần TTL/migration) ─────

  setBox<T>(key: string, data: T, meta?: { ttl?: number; version?: number; savedAt?: number }) {
    const box: ICacheBox<T> = {
      version: meta?.version ?? 1,
      savedAt: meta?.savedAt ?? Date.now(),
      ttl: meta?.ttl,
      data
    };
    this.set(key, box);
  }

  getBox<T>(key: string): ICacheBox<T> | null {
    const box = this.get<ICacheBox<T> | null>(key, null);
    return box && typeof box === 'object' ? box : null;
  }

  /** Trả về data nếu box còn “tươi” theo TTL, ngược lại trả null */
  getFreshBox<T>(key: string): T | null {
    const box = this.getBox<T>(key);
    if (!box) return null;
    if (!box.ttl) return box.data;
    return (Date.now() - box.savedAt) < box.ttl ? box.data : null;
  }

  // ───── Helpers ─────

  /** Nếu namespace rỗng → trả đúng key; nếu có → `${namespace}:${key}` */
  private ns(key: string, addSep: boolean = true): string {
    if (!this.namespace) return key;
    const sep = addSep ? ':' : '';
    return `${this.namespace}${sep}${key}`;
  }

  private safeStringify(value: unknown): string {
    try {
      return JSON.stringify(value);
    } catch {
      try { return String(value); } catch { return ''; }
    }
  }

  // ── Index nội bộ (để hỗ trợ clear-by-prefix vì nativeStorage không liệt kê được key) ──

  private indexKey(): string {
    return this.ns(this.INDEX_KEY);
  }

  private indexList(): string[] {
    const raw = this.storageDriver.getItem(this.indexKey());
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter(x => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }

  private writeIndex(list: string[]) {
    this.storageDriver.setItem(this.indexKey(), JSON.stringify(list));
  }

  private indexAdd(fullKey: string) {
    const list = this.indexList();
    if (!list.includes(fullKey)) {
      list.push(fullKey);
      this.writeIndex(list);
    }
  }

  private indexRemove(fullKey: string) {
    const list = this.indexList().filter(k => k !== fullKey);
    this.writeIndex(list);
  }

  // ───── Driver resolver (nativeStorage ưu tiên; fallback localStorage; cuối cùng no-op) ─────

  private resolveDriver(): IStorageDriver {
    if (typeof (globalThis as any)?.nativeStorage?.getItem === 'function') {
      return {
        getItem: (k) => (globalThis as any).nativeStorage.getItem(k),
        setItem: (k, v) => (globalThis as any).nativeStorage.setItem(k, v),
        removeItem: (k) => (globalThis as any).nativeStorage.removeItem(k),
        clear: () => (globalThis as any).nativeStorage.clear(),
        getStorageInfo: () => (globalThis as any).nativeStorage.getStorageInfo(),
      };
    }

    const ls = (globalThis as any)?.localStorage as Storage | undefined;
    if (ls) {
      return {
        getItem: (k) => ls.getItem(k),
        setItem: (k, v) => ls.setItem(k, v),
        removeItem: (k) => ls.removeItem(k),
        clear: () => ls.clear(),
        getStorageInfo: () => ({
          currentSize: this.approxLocalSize(ls),
          limitSize: 10 * 1024 * 1024, // Native storage ~10MB theo bạn nói
        }),
      };
    }

    console.warn('[ZmaNativeStorageService] No available storage driver.');
    return {
      getItem: () => null,
      setItem: () => void 0,
      removeItem: () => void 0,
      clear: () => void 0,
      getStorageInfo: () => ({ currentSize: 0, limitSize: 0 }),
    };
  }

  private approxLocalSize(ls: Storage): number {
    try {
      let bytes = 0;
      for (let i = 0; i < ls.length; i++) {
        const k = ls.key(i) ?? '';
        const v = ls.getItem(k) ?? '';
        bytes += k.length + v.length;
      }
      return bytes;
    } catch {
      return 0;
    }
  }
}
