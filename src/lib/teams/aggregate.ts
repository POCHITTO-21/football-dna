import { AXIS_IDS, type AxisScores } from "@/lib/scoring/model";

/** 少人数での個人の特定を防ぐため、この人数未満のチーム集計は表示しない（仕様10章） */
export const AGGREGATE_MIN_MEMBERS = 5;

export type MemberResult = { userId: string; typeId: string; axisScores: AxisScores; topPositions: string[]; createdAt: string };

export type TeamAggregate =
  | { hidden: true; count: number; threshold: number }
  | {
      hidden: false;
      count: number;
      threshold: number;
      axisAverages: AxisScores;
      typeCounts: { typeId: string; count: number }[];
      positionCounts: { positionId: string; count: number }[];
    };

/** 各選手の最新の結果だけを取り出す */
export function latestPerUser<T extends { userId: string; createdAt: string }>(rows: T[]): T[] {
  const map = new Map<string, T>();
  for (const r of rows) {
    const cur = map.get(r.userId);
    if (!cur || r.createdAt > cur.createdAt) map.set(r.userId, r);
  }
  return [...map.values()];
}

const sortCounts = <K extends string>(m: Map<string, number>, key: K) =>
  [...m.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id, count]) => ({ [key]: id, count }) as { [P in K]: string } & { count: number });

/**
 * チーム傾向の集計。1人1件（最新）で数え、閾値未満なら中身を返さない。
 * 個人ランキングや選抜スコアは作らない。
 */
export function aggregateTeam(rows: MemberResult[], threshold = AGGREGATE_MIN_MEMBERS): TeamAggregate {
  const latest = latestPerUser(rows);
  const count = latest.length;
  if (count < threshold) return { hidden: true, count, threshold };
  const axisAverages = Object.fromEntries(
    AXIS_IDS.map((a) => [a, Math.round(latest.reduce((s, r) => s + (r.axisScores[a] ?? 0), 0) / count)]),
  ) as AxisScores;
  const types = new Map<string, number>();
  const positions = new Map<string, number>();
  for (const r of latest) {
    types.set(r.typeId, (types.get(r.typeId) ?? 0) + 1);
    for (const p of r.topPositions) positions.set(p, (positions.get(p) ?? 0) + 1);
  }
  return {
    hidden: false,
    count,
    threshold,
    axisAverages,
    typeCounts: sortCounts(types, "typeId"),
    positionCounts: sortCounts(positions, "positionId"),
  };
}
