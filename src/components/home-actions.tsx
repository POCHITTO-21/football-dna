"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { QUESTION_SET, typeDef } from "@/lib/scoring/config";
import { listResults, loadDraft, type StoredResult } from "@/lib/storage";

export function HomeActions() {
  const [answered, setAnswered] = useState<number | null>(null);
  const [results, setResults] = useState<StoredResult[]>([]);

  useEffect(() => {
    const d = loadDraft(QUESTION_SET.version);
    setAnswered(d?.profile ? Object.keys(d.answers).length : null);
    setResults(listResults().slice(0, 3));
  }, []);

  return (
    <div className="space-y-3">
      {answered !== null && (
        <LinkButton href="/diagnosis/questions" size="lg" block>
          続きから再開する（{answered}/40問）
        </LinkButton>
      )}
      <LinkButton href="/diagnosis/profile" size="lg" block variant={answered !== null ? "secondary" : "primary"}>
        {answered !== null ? "最初から診断する" : "無料で診断をはじめる"}
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
                  <span className="font-bold">{typeDef(r.result.primaryTypeId).name}</span>
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
