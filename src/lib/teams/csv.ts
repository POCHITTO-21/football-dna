import { AXIS_IDS, type AxisScores } from "@/lib/scoring/model";
import { axisDef, positionLabel, typeDef } from "@/lib/scoring/config";

export type CsvRow = {
  memberName: string;
  createdAt: string;
  typeId: string;
  compositeTypeId: string | null;
  axisScores: AxisScores;
  topPositions: string[];
  /** かんたん診断（15問）の結果か。省略時は40問 */
  quick?: boolean;
};

/** CSV の1セル。表計算ソフトで数式として実行されないよう、先頭が = + - @ などなら ' を付ける */
export function csvCell(value: string | number): string {
  let s = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  // 日本時間で表示
  const j = new Date(d.getTime() + 9 * 3_600_000);
  return `${j.getUTCFullYear()}-${pad(j.getUTCMonth() + 1)}-${pad(j.getUTCDate())}`;
}

/** 同意済み選手の結果を CSV にする（Excel で文字化けしないよう BOM 付き） */
export function buildTeamCsv(rows: CsvRow[]): string {
  const header = [
    "チーム内の名前",
    "診断日",
    "タイプ",
    "複合タイプ",
    ...AXIS_IDS.map((a) => axisDef(a).label),
    "ポジション候補1",
    "ポジション候補2",
    "ポジション候補3",
    "診断の種類",
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.memberName,
        formatDate(r.createdAt),
        typeDef(r.typeId).name,
        r.compositeTypeId ? typeDef(r.compositeTypeId).name : "",
        ...AXIS_IDS.map((a) => r.axisScores[a] ?? ""),
        ...[0, 1, 2].map((i) => (r.topPositions[i] ? positionLabel(r.topPositions[i]) : "")),
        r.quick ? "かんたん（15問）" : "くわしい（40問）",
      ]
        .map((v) => csvCell(v))
        .join(","),
    );
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}
