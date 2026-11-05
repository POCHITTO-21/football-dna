"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { QUESTION_SET, UPGRADE_QUESTIONS_IN_ORDER } from "@/lib/scoring/config";
import { isKidsAgeBand } from "@/lib/profile";
import { saveDraft, type StoredResult } from "@/lib/storage";

/** かんたん診断の結果から、残りの質問に答えて40問のくわしい診断へ進む */
export function UpgradeToFull({ entry, source }: { entry: StoredResult; source: "local" | "account" }) {
  const router = useRouter();
  const remaining = UPGRADE_QUESTIONS_IN_ORDER.length;

  const start = () => {
    const ok = saveDraft({
      questionSetVersion: QUESTION_SET.version,
      profile: entry.profile,
      answers: { ...entry.answers },
      currentIndex: 0,
      kidsMode: isKidsAgeBand(entry.profile.ageBand),
      mode: "full",
      upgradeFrom: source === "local" ? { localResultId: entry.id } : {},
    });
    if (!ok) {
      window.alert("回答を準備できませんでした。ブラウザの設定（プライベートモードや保存容量）を確認してください。");
      return;
    }
    router.push("/diagnosis/questions");
  };

  return (
    <section
      aria-labelledby="upgrade-title"
      className="rounded-2xl border border-accent/50 bg-navy-900/80 p-5"
    >
      <h2 id="upgrade-title" className="text-lg font-bold">
        あと{remaining}問で、くわしい診断へ
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        いま答えた15問はそのまま使います。残りの{remaining}問に答えると、40問すべてを使った、よりくわしい結果に更新されます（約3分）。
      </p>
      <Button size="lg" block className="mt-4" onClick={start}>
        あと{remaining}問に答える
      </Button>
    </section>
  );
}
