import { createHash, randomBytes } from "node:crypto";

/** 推測困難な共有トークン（256bit、URL安全な文字列）。DBにはハッシュだけを保存する。 */
export function generateShareToken(): string {
  return randomBytes(32).toString("base64url");
}

/** DB の get_shared_result と同じ sha256 hex */
export function hashShareToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isWellFormedShareToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
