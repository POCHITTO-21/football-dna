"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ShareLinkPanel } from "@/components/share-link-panel";
import { useResultEntry } from "@/components/use-result-entry";
import { Button, LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SHARE_SIZES, buildShareCardData, drawShareCard, type ShareSize } from "@/lib/share-card";

export function ShareImage({ id, accountEnabled }: { id: string; accountEnabled: boolean }) {
  const loaded = useResultEntry(id, accountEnabled);
  const entry = loaded === undefined ? undefined : (loaded?.entry ?? null);
  const [canShareFile, setCanShareFile] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [size, setSize] = useState<ShareSize>("story");
  const [includeNickname, setIncludeNickname] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    try {
      const probe = new File([new Blob()], "x.png", { type: "image/png" });
      setCanShareFile(typeof navigator.share === "function" && !!navigator.canShare?.({ files: [probe] }));
    } catch {
      setCanShareFile(false);
    }
  }, []);

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

  const shareImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "football-dna.png", { type: "image/png" });
      try {
        setShareError(null);
        await navigator.share({ files: [file], text: "わたしのプレースタイルは「" + (data?.typeName ?? "") + "」 #FOOTBALLDNA" });
      } catch (e) {
        if ((e as Error)?.name !== "AbortError") setShareError("共有できませんでした。画像をダウンロードしてから投稿してください。");
      }
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

      {canShareFile && (
        <Button size="lg" block onClick={shareImage}>
          画像を共有する
        </Button>
      )}
      <Button size="lg" block variant={canShareFile ? "secondary" : "primary"} onClick={download}>
        画像をダウンロード
      </Button>
      {shareError && (
        <p role="alert" className="text-sm text-danger">
          {shareError}
        </p>
      )}
      <p className="text-xs leading-relaxed text-ink-muted">
        画像はご自身でSNSに投稿できます。未成年の方は、投稿する前におうちの人に確認してください。
      </p>

      {accountEnabled &&
        (loaded?.source === "account" ? (
          <ShareLinkPanel resultId={entry.id} hasNickname={hasNickname} />
        ) : (
          <p className="rounded-xl border border-navy-700 p-3 text-xs text-ink-muted">
            URLで結果を共有する「共有リンク」は、結果をアカウントに保存すると使えます（結果画面の「アカウントに保存」から）。
          </p>
        ))}
      <LinkButton href={`/results/${entry.id}`} variant="secondary" block>
        結果にもどる
      </LinkButton>
    </div>
  );
}
