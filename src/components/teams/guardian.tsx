"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChoiceGroup } from "@/components/ui/choice-fields";
import { acceptGuardian, createGuardianLink } from "@/app/actions/teams";

/** 子ども本人が保護者確認リンクを作る */
export function GuardianLinkCreator() {
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <Button
        block
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await createGuardianLink();
            if (!r.ok) return setError(r.error);
            setError(null);
            setCopied(false);
            setUrl(r.data.url);
          })
        }
      >
        保護者確認リンクを作る
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {url && (
        <div className="space-y-2 rounded-xl border border-accent/50 bg-navy-800 p-3">
          <p className="break-all font-mono text-xs">{url}</p>
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
              } catch {
                setError("コピーできませんでした。URLを長押ししてコピーしてください。");
              }
            }}
          >
            {copied ? "コピー済み" : "URLをコピー"}
          </Button>
          <p className="text-xs text-warn">
            このURLを、おうちの人（保護者）に送ってください。7日間有効で、1回だけ使えます。保護者の方は、ご自身のメールアドレスでログインしてから開きます。
          </p>
        </div>
      )}
    </div>
  );
}

const ADULT_BANDS = [
  { value: "18_29", label: "18〜29歳" },
  { value: "30_49", label: "30〜49歳" },
  { value: "50_plus", label: "50歳以上" },
];

export function GuardianAcceptForm({ token }: { token: string }) {
  const router = useRouter();
  const [ageBand, setAgeBand] = useState<string>("");
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await acceptGuardian({ token, ageBand, confirm });
          if (!r.ok) return setError(r.error);
          router.push("/guardian");
        });
      }}
    >
      <ChoiceGroup name="guardian-age" legend="あなた（保護者）の年代" options={ADULT_BANDS} value={ageBand} onChange={(v) => setAgeBand(v as string)} />
      <label className="flex min-h-11 cursor-pointer items-start gap-2 text-sm">
        <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-1 size-4 accent-[var(--green-500)]" />
        私はこのリンクを送ってきた子どもの保護者（親権者またはそれに準じる方）で、18歳以上です。
      </label>
      <Button type="submit" block disabled={pending || !ageBand || !confirm}>
        保護者として登録する
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
