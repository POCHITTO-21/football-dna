import { describe, expect, it } from "vitest";
import { generateShareToken, hashShareToken, isWellFormedShareToken } from "./share-token";
import { _resetRateLimitForTest, rateLimit } from "./rate-limit";
import { createHash } from "node:crypto";

describe("共有トークン", () => {
  it("十分な長さで毎回異なり、形式チェックを通る", () => {
    const a = generateShareToken();
    const b = generateShareToken();
    expect(a).not.toBe(b);
    expect(isWellFormedShareToken(a)).toBe(true);
    expect(isWellFormedShareToken("abc")).toBe(false);
    expect(isWellFormedShareToken(a + "!")).toBe(false);
  });
  it("ハッシュは sha256 hex（DB側 encode(digest(token,'sha256'),'hex') と一致）", () => {
    expect(hashShareToken("secret-token")).toBe(createHash("sha256").update("secret-token").digest("hex"));
    expect(hashShareToken("secret-token")).toHaveLength(64);
  });
});

describe("レート制限", () => {
  it("上限を超えると拒否し、ウィンドウ経過で回復", () => {
    _resetRateLimitForTest();
    const t = 1_000_000;
    expect(rateLimit("k", 2, 1000, t)).toBe(true);
    expect(rateLimit("k", 2, 1000, t + 1)).toBe(true);
    expect(rateLimit("k", 2, 1000, t + 2)).toBe(false);
    expect(rateLimit("other", 2, 1000, t + 2)).toBe(true);
    expect(rateLimit("k", 2, 1000, t + 1001)).toBe(true);
  });
});

import { safeNextPath } from "./safe-path";
describe("リダイレクト先の検証", () => {
  it("サイト内の相対パスのみ許可", () => {
    expect(safeNextPath("/results/abc")).toBe("/results/abc");
    expect(safeNextPath("//evil.example")).toBe("/me");
    expect(safeNextPath("https://evil.example")).toBe("/me");
    expect(safeNextPath("/\\evil")).toBe("/me");
    expect(safeNextPath(undefined)).toBe("/me");
  });
});

import { getSupabaseEnv } from "./supabase/config";
describe("Supabase の設定読み込み", () => {
  it("URL にパスが付いていてもオリジンだけを使い、未設定・不正値は null", () => {
    const old = { ...process.env };
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "k";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co/rest/v1/";
    expect(getSupabaseEnv()?.url).toBe("https://abc.supabase.co");
    process.env.NEXT_PUBLIC_SUPABASE_URL = " https://abc.supabase.co ";
    expect(getSupabaseEnv()?.url).toBe("https://abc.supabase.co");
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://abc.supabase.co";
    expect(getSupabaseEnv()).toBeNull();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    expect(getSupabaseEnv()).toBeNull();
    process.env = old;
  });
});
