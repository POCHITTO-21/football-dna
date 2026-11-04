/**
 * Supabase の設定有無。未設定なら Phase 1（ゲスト診断）だけで動作し、アカウント機能は非表示になる。
 * NEXT_PUBLIC_ の値はビルド時にクライアントへ埋め込まれる（anon key は RLS 前提で公開可）。
 * service role key はこのアプリでは使用しない。
 */
export type SupabaseEnv = { url: string; anonKey: string };

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.hostname !== "localhost" && u.hostname !== "127.0.0.1") return null;
    // ダッシュボードから「…supabase.co/rest/v1/」のようにパス付きで貼られても動くよう、オリジンだけを使う
    return { url: u.origin, anonKey };
  } catch {
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null;
}

/** 共有リンクなどの絶対URLを作るためのサイトURL */
export function getSiteUrl(): string {
  // Netlify はビルド時に URL（本番URL）を設定する。Vercel は VERCEL_URL。
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return raw.replace(/\/+$/, "");
}
