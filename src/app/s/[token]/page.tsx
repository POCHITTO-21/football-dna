import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AxisRadar } from "@/components/axis-radar";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { getSharedResult } from "@/lib/shared-result";
import { positionLabel, typeDef } from "@/lib/scoring/config";
import type { AxisScores } from "@/lib/scoring/model";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const r = await getSharedResult(token);
  if (!r) return { title: "共有リンク", robots: { index: false, follow: false } };
  const t = typeDef(r.type_id);
  const title = `${t.name}｜わたしのサッカーDNA`;
  return {
    title,
    description: `${t.catchcopy}。15問でわかるサッカーのプレースタイル診断「FOOTBALL DNA」`,
    robots: { index: false, follow: false },
    openGraph: { title, type: "website" },
    twitter: { card: "summary_large_image", title },
  };
}

export default async function SharedPage({ params }: Props) {
  const { token } = await params;
  const r = await getSharedResult(token);
  if (!r) notFound();
  const t = typeDef(r.type_id);
  const composite = r.composite_type_id ? typeDef(r.composite_type_id) : null;
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-accent/40 bg-gradient-to-b from-navy-800 to-navy-900 p-6 text-center">
        <p className="text-xs font-bold tracking-[0.25em] text-accent">FOOTBALL DNA</p>
        <p className="mt-2 text-sm text-ink-muted">{r.nickname ? `${r.nickname} さんのプレースタイル` : "共有されたプレースタイル"}</p>
        <h1 className="mt-2 text-3xl font-black">{t.name}</h1>
        <p className="mt-1 font-bold text-accent">{t.catchcopy}</p>
        <p className="mt-4 text-left text-sm leading-relaxed">{t.summary}</p>
        {composite && <p className="mt-3 text-left text-sm text-ink-muted">複合タイプ：{t.name} × {composite.name}</p>}
      </section>
      <Card>
        <AxisRadar scores={r.axis_scores as AxisScores} />
        <p className="mt-2 text-center text-sm">
          ポジションの可能性：{r.top_positions.map((p) => positionLabel(p)).join("・")}
        </p>
      </Card>
      <p className="text-xs text-ink-muted">
        自己回答にもとづくプレー志向の傾向で、能力の評価や選手選抜の判断ではありません。
      </p>
      <LinkButton href="/" size="lg" block>
        自分も診断してみる（無料）
      </LinkButton>
    </div>
  );
}
