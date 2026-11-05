"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { QUESTION_SET, questionsForMode, typeDef } from "@/lib/scoring/config";
import { draftMode, listResults, loadDraft, type StoredResult } from "@/lib/storage";

export function HomeActions() {
  const [resume, setResume] = useState<{ answered: number; total: number } | null>(null);
  const [results, setResults] = useState<StoredResult[]>([]);

  useEffect(() => {
    const d = loadDraft(QUESTION_SET.version);
    if (d?.profile) {
      const qs = questionsForMode(draftMode(d), { upgrade: Boolean(d.upgradeFrom) });
      setResume({ answered: qs.filter((q) => d.answers[q.id] !== undefined).length, total: qs.length });
    } else {
      setResume(null);
    }
    setResults(listResults().slice(0, 3));
  }, []);

  return (
    <div className="space-y-3">
      {resume !== null && (
        <LinkButton href="/diagnosis/questions" size="lg" block>
          続きから再開する（{resume.answered}/{resume.total}問）
        </LinkButton>
      )}
      <LinkButton href="/diagnosis/profile?mode=quick" size="lg" block variant={resume !== null ? "secondary" : "primary"}>
        {resume !== null ? "かんたん診断を最初から（15問・約2分）" : "無料でかんたん診断（15問・約2分）"}
      </LinkButton>
      <LinkButton href="/diagnosis/profile?mode=full" block variant="secondary">
        くわしい診断（40問・約5分）
      </LinkButton>
      {results.length > 0 && (
        <div className="rounded-2xl border border-navy-700 bg-navy-900/70 p-4">
          <h2 className="mb-2 text-sm font-bold text-ink-muted">この端末の診断結果</h2>
          <ul className="space-y-1">
            {results.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/results/${r.id}`}
                  className="flex min-h-11 items-center justify-between rounded-lg px-2 hover:bg-navy-800"
                >
                  <span className="font-bold">
                    {typeDef(r.result.primaryTypeId).name}
                    {r.result.mode === "quick" && <span className="ml-2 text-xs font-normal text-ink-muted">かんたん</span>}
                  </span>
                  <span className="text-xs text-ink-muted">{new Date(r.createdAt).toLocaleDateString("ja-JP")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
