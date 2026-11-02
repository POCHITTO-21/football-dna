/** オープンリダイレクト防止: サイト内の相対パスだけ許可する */
export function safeNextPath(next: string | null | undefined, fallback = "/me"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\r\n]/.test(next)) {
    return fallback;
  }
  return next;
}
