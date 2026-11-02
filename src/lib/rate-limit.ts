/**
 * 簡易レート制限（プロセス内メモリ、固定ウィンドウ）。
 * サーバーレス環境ではインスタンスごとに独立するため「最低限の乱用防止」として扱う。
 * 本格運用時は Supabase / Upstash 等の共有ストアに置き換える。
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

export function _resetRateLimitForTest() {
  buckets.clear();
}
