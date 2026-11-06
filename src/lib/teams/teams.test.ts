import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { formatInviteCode, generateInviteCode, hashInviteCode, normalizeInviteCode } from "./invite-code";
import { aggregateTeam, latestPerUser, type MemberResult } from "./aggregate";
import { buildTeamCsv, csvCell } from "./csv";
import { dbErrorMessage } from "./errors";
import { AXIS_IDS, type AxisScores } from "@/lib/scoring/model";

const scores = (v: number) => Object.fromEntries(AXIS_IDS.map((a) => [a, v])) as AxisScores;
const row = (userId: string, typeId: string, v: number, createdAt = "2026-11-01T00:00:00Z"): MemberResult => ({
  userId,
  typeId,
  axisScores: scores(v),
  topPositions: ["CM", "AM", "DM"],
  createdAt,
});

describe("招待コード", () => {
  it("10文字で、入力ゆれを吸収して正規化できる", () => {
    const c = generateInviteCode();
    expect(c).toMatch(/^[2-9A-HJKMNP-TV-Z]{10}$/);
    expect(generateInviteCode()).not.toBe(c);
    expect(normalizeInviteCode(formatInviteCode(c).toLowerCase())).toBe(c);
    expect(normalizeInviteCode(` ${c.slice(0, 5)} ${c.slice(5)} `)).toBe(c);
  });
  it("形式が違うコードは null", () => {
    expect(normalizeInviteCode("ABC")).toBeNull();
    expect(normalizeInviteCode("ABCDE-FGHI0")).toBeNull(); // 0 は使わない
    expect(normalizeInviteCode("")).toBeNull();
  });
  it("ハッシュは DB と同じ sha256 hex", () => {
    expect(hashInviteCode("PLAYERCODE")).toBe(createHash("sha256").update("PLAYERCODE").digest("hex"));
  });
});

describe("チーム集計", () => {
  it("5人未満は中身を返さない", () => {
    const a = aggregateTeam([row("a", "T01", 50), row("b", "T01", 60), row("c", "T02", 70), row("d", "T03", 80)]);
    expect(a).toEqual({ hidden: true, count: 4, threshold: 5 });
  });
  it("1人1件（最新）で数える。同じ人の複数結果で人数を水増しできない", () => {
    const rows = [1, 2, 3, 4, 5].map((i) => row("same", "T01", 50, `2026-11-0${i}T00:00:00Z`));
    expect(aggregateTeam(rows).count).toBe(1);
    expect(latestPerUser(rows)[0].createdAt).toBe("2026-11-05T00:00:00Z");
  });
  it("5人以上で平均とタイプ・ポジションの人数を返す", () => {
    const a = aggregateTeam([row("a", "T01", 40), row("b", "T01", 50), row("c", "T02", 60), row("d", "T02", 70), row("e", "T03", 81)]);
    expect(a.hidden).toBe(false);
    if (a.hidden) return;
    expect(a.count).toBe(5);
    expect(a.axisAverages.DRB).toBe(60);
    expect(a.typeCounts).toEqual([
      { typeId: "T01", count: 2 },
      { typeId: "T02", count: 2 },
      { typeId: "T03", count: 1 },
    ]);
    expect(a.positionCounts[0]).toEqual({ positionId: "AM", count: 5 });
  });
});

describe("CSV", () => {
  it("数式として実行されうる値を無害化し、カンマ・改行・引用符をエスケープ", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("@x")).toBe("'@x");
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell("a\nb")).toBe('"a\nb"');
    expect(csvCell(-5)).toBe("-5");
    expect(csvCell("たろう")).toBe("たろう");
  });
  it("BOM付き・ヘッダーと行数が正しい", () => {
    const csv = buildTeamCsv([
      { memberName: "たろう", createdAt: "2026-11-01T20:00:00Z", typeId: "T01", compositeTypeId: null, axisScores: scores(50), topPositions: ["CM", "AM", "DM"] },
    ]);
    expect(csv.startsWith("﻿")).toBe(true);
    const lines = csv.slice(1).trimEnd().split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[0].split(",")).toHaveLength(16);
    expect(lines[1]).toContain("たろう,2026-11-02,"); // 日本時間
    expect(lines[1].endsWith("くわしい（40問）")).toBe(true);
  });
});

describe("DBエラーの表示", () => {
  it("コードを日本語にする。不明なものは既定の文言", () => {
    expect(dbErrorMessage({ message: "invite_invalid" })).toContain("招待コード");
    expect(dbErrorMessage({ message: "something else" }, "X")).toBe("X");
    expect(dbErrorMessage(null)).toBe("操作に失敗しました。");
  });
});
