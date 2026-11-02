"use client";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { AXIS_IDS, type AxisScores } from "@/lib/scoring/model";
import { axisDef } from "@/lib/scoring/config";

export function AxisRadar({ scores }: { scores: AxisScores }) {
  const data = AXIS_IDS.map((a) => ({ axis: axisDef(a).short, score: scores[a] }));
  return (
    <figure>
      <div className="h-72 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="#2a3f78" />
            <PolarAngleAxis dataKey="axis" tick={{ fill: "#eef3ff", fontSize: 12, fontWeight: 700 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar dataKey="score" stroke="#3ee08a" strokeWidth={2} fill="#1fcf6f" fillOpacity={0.35} isAnimationActive={false} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        8つのプレー志向のレーダーチャート。
        {AXIS_IDS.map((a) => `${axisDef(a).label} ${scores[a]}`).join("、")}
      </figcaption>
    </figure>
  );
}
