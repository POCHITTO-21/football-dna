/**
 * SNS共有画像（1080x1350 / 1200x630）の描画。
 * 画像に載せるのは「タイプ名・キャッチコピー・8軸の傾向・ポジション候補」と、
 * 本人が明示的に選んだ場合のニックネームだけ（仕様 11章）。
 */
import { AXIS_IDS, type AxisScores } from "./scoring/model";
import { axisDef, typeDef } from "./scoring/config";
import type { DiagnosisResult } from "./scoring/diagnose";

export type ShareCardData = {
  typeName: string;
  catchcopy: string;
  axes: { label: string; score: number }[];
  positions: string[];
  nickname: string | null;
};

export const SHARE_SIZES = {
  story: { width: 1080, height: 1350 },
  ogp: { width: 1200, height: 630 },
} as const;
export type ShareSize = keyof typeof SHARE_SIZES;

/** 画像に載せるデータを作る純粋関数。ニックネームは includeNickname=true のときだけ含む。 */
export function buildShareCardData(
  result: Pick<DiagnosisResult, "primaryTypeId" | "axisScores" | "topPositions">,
  opts: { includeNickname: boolean; nickname?: string | null },
): ShareCardData {
  const t = typeDef(result.primaryTypeId);
  const nick = opts.includeNickname ? (opts.nickname ?? "").trim().slice(0, 12) : "";
  return {
    typeName: t.name,
    catchcopy: t.catchcopy,
    axes: AXIS_IDS.map((a) => ({ label: axisDef(a).short, score: (result.axisScores as AxisScores)[a] })),
    positions: result.topPositions.map((p) => p.positionId),
    nickname: nick ? nick : null,
  };
}

const C = {
  bg1: "#0a1530",
  bg2: "#060c1c",
  grid: "#2a3f78",
  green: "#1fcf6f",
  greenLight: "#3ee08a",
  ink: "#eef3ff",
  muted: "#a9b6d6",
};
const FONT = '"Hiragino Sans","Noto Sans JP","Yu Gothic UI","Meiryo",sans-serif';

function drawRadar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, data: ShareCardData, labelSize: number) {
  const n = data.axes.length;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 2;
  for (const f of [0.25, 0.5, 0.75, 1]) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = cx + Math.cos(angle(i)) * r * f;
      const y = cy + Math.sin(angle(i)) * r * f;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r);
    ctx.stroke();
  }
  ctx.beginPath();
  data.axes.forEach((a, i) => {
    const rr = (r * Math.max(a.score, 4)) / 100;
    const x = cx + Math.cos(angle(i)) * rr;
    const y = cy + Math.sin(angle(i)) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = "rgba(31,207,111,0.38)";
  ctx.fill();
  ctx.strokeStyle = C.greenLight;
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  data.axes.forEach((a, i) => {
    const x = cx + Math.cos(angle(i)) * (r + labelSize * 1.9);
    const y = cy + Math.sin(angle(i)) * (r + labelSize * 1.5);
    ctx.fillStyle = C.ink;
    ctx.font = `700 ${labelSize}px ${FONT}`;
    ctx.fillText(a.label, x, y - labelSize * 0.5);
    ctx.fillStyle = C.greenLight;
    ctx.font = `900 ${labelSize * 0.95}px ${FONT}`;
    ctx.fillText(String(a.score), x, y + labelSize * 0.65);
  });
}

function background(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, C.bg1);
  g.addColorStop(1, C.bg2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // ピッチ風のライン
  ctx.strokeStyle = "rgba(31,207,111,0.10)";
  ctx.lineWidth = 4;
  ctx.strokeRect(30, 30, w - 60, h - 60);
  ctx.beginPath();
  ctx.arc(w / 2, h, Math.min(w, h) * 0.28, Math.PI, 2 * Math.PI);
  ctx.stroke();
}

function brand(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, align: CanvasTextAlign) {
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.font = `900 ${size}px ${FONT}`;
  const t1 = "FOOTBALL ";
  const w1 = ctx.measureText(t1).width;
  const w2 = ctx.measureText("DNA").width;
  const start = align === "center" ? x - (w1 + w2) / 2 : x;
  ctx.textAlign = "left";
  ctx.fillStyle = C.ink;
  ctx.fillText(t1, start, y);
  ctx.fillStyle = C.green;
  ctx.fillText("DNA", start + w1, y);
  ctx.fillStyle = C.muted;
  ctx.font = `700 ${Math.round(size * 0.36)}px ${FONT}`;
  const sub = "by FOOTBALL DNA LAB";
  const ws = ctx.measureText(sub).width;
  ctx.fillText(sub, align === "center" ? x - ws / 2 : x, y + size * 0.62);
}

export function drawShareCard(ctx: CanvasRenderingContext2D, size: ShareSize, data: ShareCardData) {
  const { width: w, height: h } = SHARE_SIZES[size];
  background(ctx, w, h);
  const footer = "自己回答にもとづくプレースタイルの傾向です";

  if (size === "story") {
    brand(ctx, w / 2, 130, 56, "center");
    ctx.textAlign = "center";
    ctx.fillStyle = C.muted;
    ctx.font = `700 34px ${FONT}`;
    ctx.fillText(data.nickname ? `${data.nickname} のプレースタイル` : "わたしのプレースタイル", w / 2, 230);
    ctx.fillStyle = C.ink;
    ctx.font = `900 ${data.typeName.length > 9 ? 84 : 104}px ${FONT}`;
    ctx.fillText(data.typeName, w / 2, 350, w - 120);
    ctx.fillStyle = C.greenLight;
    ctx.font = `700 40px ${FONT}`;
    ctx.fillText(data.catchcopy, w / 2, 420);
    drawRadar(ctx, w / 2, 770, 220, data, 34);
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = C.muted;
    ctx.font = `700 32px ${FONT}`;
    ctx.fillText("ポジションの可能性", w / 2, 1150);
    ctx.fillStyle = C.ink;
    ctx.font = `900 52px ${FONT}`;
    ctx.fillText(data.positions.join("  /  "), w / 2, 1218);
    ctx.fillStyle = C.muted;
    ctx.font = `500 26px ${FONT}`;
    ctx.fillText(footer, w / 2, 1290);
  } else {
    brand(ctx, 80, 110, 44, "left");
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = C.muted;
    ctx.font = `700 28px ${FONT}`;
    ctx.fillText(data.nickname ? `${data.nickname} のプレースタイル` : "わたしのプレースタイル", 80, 200);
    ctx.fillStyle = C.ink;
    ctx.font = `900 ${data.typeName.length > 9 ? 60 : 72}px ${FONT}`;
    ctx.fillText(data.typeName, 80, 290, 600);
    ctx.fillStyle = C.greenLight;
    ctx.font = `700 30px ${FONT}`;
    ctx.fillText(data.catchcopy, 80, 345, 600);
    ctx.fillStyle = C.muted;
    ctx.font = `700 26px ${FONT}`;
    ctx.fillText("ポジションの可能性", 80, 440);
    ctx.fillStyle = C.ink;
    ctx.font = `900 42px ${FONT}`;
    ctx.fillText(data.positions.join(" / "), 80, 495);
    ctx.fillStyle = C.muted;
    ctx.font = `500 20px ${FONT}`;
    ctx.fillText(footer, 80, 570);
    drawRadar(ctx, 935, 325, 160, data, 24);
  }
}
