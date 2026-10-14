/** localStorage bọc try/catch — trong vài webview có thể bị chặn; khi đó giữ tạm trong bộ nhớ. */
const memory: Record<string, string> = {};

export function getItem(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return memory[key] ?? null; }
}
export function setItem(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { memory[key] = value; }
}
export function removeItem(key: string) {
  try { window.localStorage.removeItem(key); } catch { delete memory[key]; }
}
export function getJSON<T>(key: string, fallback: T): T {
  const raw = getItem(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}
export function setJSON(key: string, value: unknown) {
  setItem(key, JSON.stringify(value));
}
