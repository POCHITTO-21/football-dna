import { randomInt } from "node:crypto";
import { hashShareToken } from "@/lib/share-token";

/** 読み間違えやすい文字（0/O, 1/I/L, U）を除いた30文字 */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
export const INVITE_CODE_LENGTH = 10;

/** チーム招待コード（10文字 ≒ 49bit）。DB にはハッシュだけを保存する。 */
export function generateInviteCode(): string {
  let s = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

/** 入力ゆれ（小文字・ハイフン・空白）を吸収する。形式が違えば null。 */
export function normalizeInviteCode(input: string): string | null {
  const s = input.toUpperCase().replace(/[\s\-‐－ー]/g, "");
  if (s.length !== INVITE_CODE_LENGTH) return null;
  for (const ch of s) if (!ALPHABET.includes(ch)) return null;
  return s;
}

/** 表示用に 5文字-5文字 に区切る */
export function formatInviteCode(code: string): string {
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

export const hashInviteCode = hashShareToken;
