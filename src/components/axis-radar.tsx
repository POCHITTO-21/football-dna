"use client";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { AXIS_IDS, type AxisScores } from "@/lib/scoring/model";
import { axisDef } from "@/lib/scoring/config";

/** compare を渡すと、比較用（前回の結果やチーム平均など）を点線で重ねて表示する */
export function AxisRadar({ scores, compare, compareLabel }: { scores: AxisScores; compare?: AxisScores; compareLabel?: string }) {
  const data = AXIS_IDS.map((a) => ({ axis: axisDef(a).short, score: scores[a], compare: compare?.[a] }));
  return (
    <figure>
      <div className="h-72 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="#2a3f78" />
            <PolarAngleAxis dataKey="axis" tick={{ fill: "#eef3ff", fontSize: 12, fontWeight: 700 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            {compare && (
              <Radar dataKey="compare" stroke="#8ea2d8" strokeWidth={2} strokeDasharray="4 4" fill="none" isAnimationActive={false} />
            )}
            <Radar dataKey="score" stroke="#3ee08a" strokeWidth={2} fill="#1fcf6f" fillOpacity={0.35} isAnimationActive={false} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        8つのプレー志向のレーダーチャート。
        {AXIS_IDS.map((a) => `${axisDef(a).label} ${scores[a]}`).join("、")}
        {compare && `。${compareLabel ?? "比較"}：${AXIS_IDS.map((a) => `${axisDef(a).label} ${compare[a]}`).join("、")}`}
      </figcaption>
      {compare && (
        <p aria-hidden className="mt-1 flex justify-center gap-4 text-xs text-ink-muted">
          <span>
            <span className="mr-1 inline-block h-0.5 w-4 bg-[#3ee08a] align-middle" />
            最新
          </span>
          <span>
            <span className="mr-1 inline-block w-4 border-t-2 border-dashed border-[#8ea2d8] align-middle" />
            {compareLabel ?? "比較"}
          </span>
        </p>
      )}
    </figure>
  );
}
