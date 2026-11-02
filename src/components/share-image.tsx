"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SHARE_SIZES, buildShareCardData, drawShareCard, type ShareSize } from "@/lib/share-card";
import { getResult, type StoredResult } from "@/lib/storage";

export function ShareImage({ id }: { id: string }) {
  const [entry, setEntry] = useState<StoredResult | null | undefined>(undefined);
  const [size, setSize] = useState<ShareSize>("story");
  const [includeNickname, setIncludeNickname] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => setEntry(getResult(id)), [id]);

  const data = useMemo(
    () =>
      entry
        ? buildShareCardData(entry.result, { includeNickname, nickname: entry.profile.nickname })
        : null,
    [entry, includeNickname],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const { width, height } = SHARE_SIZES[size];
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) drawShareCard(ctx, size, data);
  }, [data, size]);

  if (entry === undefined) return <p className="py-20 text-center text-ink-muted">読み込み中…</p>;
  if (entry === null) {
    return (
      <Card className="space-y-3 text-center">
        <h1 className="text-xl font-bold">結果が見つかりません</h1>
        <LinkButton href="/" block>
          トップへ
        </LinkButton>
      </Card>
    );
  }

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `football-dna-${size === "story" ? "1080x1350" : "1200x630"}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  };

  const hasNickname = !!entry.profile.nickname?.trim();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black">SNS用の画像</h1>
        <p className="mt-1 text-sm text-ink-muted">
          画像にはタイプ名・8つの志向・ポジション候補だけが入ります。名前やチーム名などは入りません。
        </p>
      </div>

      <div role="radiogroup" aria-label="画像サイズ" className="grid grid-cols-2 gap-2">
        {(
          [
            ["story", "縦長（1080×1350）", "Instagram・ストーリー向け"],
            ["ogp", "横長（1200×630）", "X・ブログ向け"],
          ] as const
        ).map(([key, label, sub]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={size === key}
            onClick={() => setSize(key)}
            className={cn(
              "min-h-14 rounded-xl border px-3 py-2 text-left text-sm",
              size === key ? "border-accent bg-accent/15" : "border-navy-600 bg-navy-800 text-ink-muted",
            )}
          >
            <span className="block font-bold text-ink">{label}</span>
            <span className="text-xs">{sub}</span>
          </button>
        ))}
      </div>

      {hasNickname && (
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeNickname}
            onChange={(e) => setIncludeNickname(e.target.checked)}
            className="size-4 accent-[var(--green-500)]"
          />
          ニックネーム「{entry.profile.nickname}」を画像に入れる
        </label>
      )}

      <div className="overflow-hidden rounded-2xl border border-navy-700">
        <canvas
          ref={canvasRef}
          className="block h-auto w-full"
          role="img"
          aria-label={`共有画像のプレビュー：${data?.typeName ?? ""}`}
        />
      </div>

      <Button size="lg" block onClick={download}>
        画像をダウンロード
      </Button>
      <p className="text-xs leading-relaxed text-ink-muted">
        ダウンロードした画像は、ご自身でSNSに投稿できます。未成年の方は、投稿する前におうちの人に確認してください。
        共有リンクの発行やスマホの共有ボタン連携は今後のアップデートで対応予定です。
      </p>
      <LinkButton href={`/results/${entry.id}`} variant="secondary" block>
        結果にもどる
      </LinkButton>
    </div>
  );
}
