"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, LinkButton } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { QUESTION_SET, QUESTIONS_IN_ORDER } from "@/lib/scoring/config";
import { diagnoseCurrent } from "@/lib/scoring";
import { clearDraft, loadDraft, saveDraft, saveResult, type Draft } from "@/lib/storage";

const TOTAL = QUESTIONS_IN_ORDER.length;

export function Questionnaire() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [review, setReview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const advanceTimer = useRef<number | null>(null);

  useEffect(() => {
    const d = loadDraft(QUESTION_SET.version);
    if (!d?.profile) {
      router.replace("/diagnosis/profile");
      return;
    }
    setDraft({ ...d, currentIndex: Math.min(d.currentIndex, TOTAL - 1) });
    setLoaded(true);
  }, [router]);

  const persist = useCallback((next: Draft) => {
    setDraft(next);
    const { updatedAt: _u, ...rest } = next;
    void _u;
    setSaveFailed(!saveDraft(rest));
  }, []);

  useEffect(() => () => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
  }, []);

  const index = draft?.currentIndex ?? 0;
  const q = QUESTIONS_IN_ORDER[index];
  const kids = draft?.kidsMode ?? false;
  const answeredCount = draft ? QUESTIONS_IN_ORDER.filter((x) => draft.answers[x.id] !== undefined).length : 0;
  const unanswered = draft ? QUESTIONS_IN_ORDER.filter((x) => draft.answers[x.id] === undefined) : [];

  const goTo = useCallback(
    (i: number) => {
      if (!draft) return;
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
      setReview(false);
      persist({ ...draft, currentIndex: Math.max(0, Math.min(TOTAL - 1, i)) });
    },
    [draft, persist],
  );

  // 設問が変わったら見出しにフォーカス（スクリーンリーダー・キーボード利用者向け）
  useEffect(() => {
    if (loaded && !review) headingRef.current?.focus();
  }, [index, loaded, review]);

  const answer = useCallback(
    (value: number) => {
      if (!draft || review) return;
      const answers = { ...draft.answers, [q.id]: value };
      const next = { ...draft, answers };
      persist(next);
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
      advanceTimer.current = window.setTimeout(() => {
        if (index < TOTAL - 1) {
          persist({ ...next, currentIndex: index + 1 });
        } else {
          setReview(true);
        }
      }, 220);
    },
    [draft, index, persist, q, review],
  );

  // キーボード: 1〜4で回答、←で戻る
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (review || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        answer(Number(e.key));
      } else if (e.key === "ArrowLeft" && index > 0) {
        goTo(index - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer, goTo, index, review]);

  const submit = () => {
    if (!draft?.profile) return;
    const out = diagnoseCurrent({
      answers: draft.answers,
      gkInterest: draft.profile.gkInterest,
      foot: draft.profile.foot,
    });
    if (!out.ok) {
      setError(
        out.reason === "missing"
          ? `未回答の質問が${out.missing.length}問あります。すべてに答えると結果が出ます。`
          : "回答データに問題がありました。お手数ですが該当の質問に答え直してください。",
      );
      setReview(true);
      return;
    }
    const saved = saveResult({ profile: draft.profile, answers: draft.answers, result: out.result });
    if (!saved) {
      setError("結果を保存できませんでした。ブラウザの設定（プライベートモードや保存容量）を確認してください。");
      return;
    }
    clearDraft();
    router.push(`/results/${saved.id}`);
  };

  if (!loaded || !draft) {
    return <p className="py-20 text-center text-ink-muted">読み込み中…</p>;
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-accent">STEP 2 / 2</span>
          <span className="text-ink-muted" aria-live="polite">
            回答済み {answeredCount} / {TOTAL}
          </span>
        </div>
        <Progress value={answeredCount} max={TOTAL} label="回答の進み具合" />
        <div className="flex items-center justify-between">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={kids}
              onChange={(e) => persist({ ...draft, kidsMode: e.target.checked })}
              className="size-4 accent-[var(--green-500)]"
            />
            やさしい ことばで ひょうじ
          </label>
          <button
            type="button"
            onClick={() => setReview((r) => !r)}
            className="min-h-11 px-2 text-sm text-ink-muted underline underline-offset-2 hover:text-ink"
          >
            {review ? "質問にもどる" : "回答の一覧"}
          </button>
        </div>
        {saveFailed && (
          <p role="status" className="text-xs text-warn">
            途中保存ができない状態です（ブラウザの設定を確認してください）。このまま回答は続けられます。
          </p>
        )}
      </div>

      {review ? (
        <ReviewPanel
          draft={draft}
          unansweredIds={unanswered.map((u) => u.id)}
          onJump={(i) => goTo(i)}
          onSubmit={submit}
          error={error}
        />
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-navy-700 bg-navy-900/80 p-5">
            <p className="text-sm text-ink-muted">
              Q{index + 1}. {kids ? QUESTION_SET.kidsPrompt : QUESTION_SET.prompt}
            </p>
            <h1 ref={headingRef} tabIndex={-1} className="mt-3 min-h-[4.5rem] text-xl font-bold leading-relaxed outline-none">
              {kids ? q.kidsText : q.text}
            </h1>
          </div>

          <div role="group" aria-label="回答の選択肢" className="grid gap-3">
            {[...QUESTION_SET.choices].reverse().map((c) => {
              const selected = draft.answers[q.id] === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => answer(c.value)}
                  className={cn(
                    "flex min-h-14 items-center gap-3 rounded-2xl border px-4 text-left text-base font-bold transition-colors",
                    selected
                      ? "border-accent bg-accent text-navy-950"
                      : "border-navy-600 bg-navy-800 text-ink hover:border-accent/60",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-sm",
                      selected ? "bg-navy-950 text-accent" : "bg-navy-700 text-ink-muted",
                    )}
                  >
                    {c.value}
                  </span>
                  {kids ? c.kidsLabel : c.label}
                </button>
              );
            })}
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => goTo(index - 1)} disabled={index === 0} className="flex-1">
              ← 戻る
            </Button>
            {index < TOTAL - 1 ? (
              <Button
                variant="secondary"
                onClick={() => goTo(index + 1)}
                disabled={draft.answers[q.id] === undefined}
                className="flex-1"
              >
                次へ →
              </Button>
            ) : (
              <Button onClick={() => setReview(true)} className="flex-1">
                確認へ
              </Button>
            )}
          </div>
          <p className="text-center text-xs text-ink-muted">
            回答は自動で途中保存されます。キーボードの 1〜4 でも回答できます。
          </p>
        </div>
      )}
    </div>
  );
}

function ReviewPanel({
  draft,
  unansweredIds,
  onJump,
  onSubmit,
  error,
}: {
  draft: Draft;
  unansweredIds: string[];
  onJump: (i: number) => void;
  onSubmit: () => void;
  error: string | null;
}) {
  const done = unansweredIds.length === 0;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">回答の確認</h1>
      <p className="text-sm text-ink-muted" role="status">
        {done
          ? "すべての質問に回答しました。番号を押すと答え直せます。"
          : `未回答が ${unansweredIds.length} 問あります（オレンジ枠）。番号を押すとその質問に移動します。`}
      </p>
      <ol className="grid grid-cols-5 gap-2">
        {QUESTIONS_IN_ORDER.map((q, i) => {
          const v = draft.answers[q.id];
          const missing = v === undefined;
          return (
            <li key={q.id}>
              <button
                type="button"
                onClick={() => onJump(i)}
                aria-label={`質問${i + 1}${missing ? "（未回答）" : `（回答 ${v}）`}`}
                className={cn(
                  "flex h-12 w-full flex-col items-center justify-center rounded-xl border text-xs font-bold",
                  missing ? "border-warn text-warn" : "border-navy-600 bg-navy-800 text-ink",
                )}
              >
                <span>{i + 1}</span>
                <span aria-hidden className="text-[10px] text-ink-muted">
                  {missing ? "未" : v}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {error && (
        <p role="alert" className="rounded-xl border border-danger/50 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      )}
      <Button size="lg" block onClick={onSubmit} disabled={!done}>
        結果を見る
      </Button>
      <LinkButton href="/diagnosis/profile" variant="ghost" block>
        基本情報を修正する
      </LinkButton>
    </div>
  );
}
