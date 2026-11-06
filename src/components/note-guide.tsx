import { Card, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { noteLinkFor } from "@/lib/note-links";

/** 診断結果から、タイプ別の詳しい練習メニュー・食事ガイド（note の有料メンバーシップ）へ案内する。 */
export function NoteGuide({ typeId, typeName }: { typeId: string; typeName: string }) {
  const link = noteLinkFor(typeId);
  if (!link) return null;
  return (
    <Card>
      <CardTitle>もっと詳しく：練習メニュー＆食事ガイド</CardTitle>
      <p className="text-sm">
        {link.forType ? `${typeName}向けの` : "タイプ別の"}
        週ごとの練習メニューと、練習量に合わせた食事のポイントを note で公開しています（有料メンバーシップ）。
      </p>
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ variant: "secondary", block: true, className: "mt-4" })}
      >
        note で見る（外部サイト）
      </a>
      <p className="mt-3 text-xs text-ink-muted">
        note は外部サービスです。購入・支払い・解約は note の利用規約にもとづきます。未成年の方は保護者の方と相談してください。診断結果が note に送られることはありません。
      </p>
    </Card>
  );
}
