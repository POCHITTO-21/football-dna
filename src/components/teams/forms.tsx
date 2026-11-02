"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChoiceGroup } from "@/components/ui/choice-fields";
import { createInvite, createTeam, joinTeam, updateMyAgeBand } from "@/app/actions/teams";
import { AGE_BANDS } from "@/lib/profile";

const inputClass = "h-11 w-full rounded-xl border border-navy-600 bg-navy-800 px-3 text-ink";

function Field({ id, label, hint, ...props }: { id: string; label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block font-bold">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-ink-muted">
          {hint}
        </p>
      )}
      <input id={id} aria-describedby={hint ? `${id}-hint` : undefined} className={inputClass} {...props} />
    </div>
  );
}

function ErrorText({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="text-sm text-danger">
      {error}
    </p>
  ) : null;
}

export function CreateTeamForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [memberName, setMemberName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await createTeam({ name, memberName });
          if (!r.ok) return setError(r.error);
          router.push(`/teams/${r.data.teamId}`);
        });
      }}
    >
      <Field id="team-name" label="チーム名" maxLength={40} required value={name} onChange={(e) => setName(e.target.value)} />
      <Field
        id="owner-name"
        label="チーム内でのあなたの表示名"
        hint="例：山田コーチ。選手や他のコーチに表示されます。"
        maxLength={20}
        required
        value={memberName}
        onChange={(e) => setMemberName(e.target.value)}
      />
      <Button type="submit" block disabled={pending || !name.trim() || !memberName.trim()}>
        チームを作る
      </Button>
      <ErrorText error={error} />
    </form>
  );
}

export function JoinTeamForm({ initialCode = "" }: { initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [memberName, setMemberName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await joinTeam({ code, memberName });
          if (!r.ok) return setError(r.error);
          router.push(`/teams/${r.data.teamId}`);
        });
      }}
    >
      <Field
        id="invite-code"
        label="招待コード"
        hint="指導者から受け取った10文字のコード（例：ABCDE-FGHJK）"
        autoCapitalize="characters"
        autoComplete="off"
        maxLength={20}
        required
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <Field
        id="member-name"
        label="チーム内での表示名"
        hint="指導者に表示されます。本名でなくてもかまいません（例：背番号やニックネーム）。"
        maxLength={20}
        required
        value={memberName}
        onChange={(e) => setMemberName(e.target.value)}
      />
      <Button type="submit" block disabled={pending || !code.trim() || !memberName.trim()}>
        参加を申請する
      </Button>
      <ErrorText error={error} />
    </form>
  );
}

const EXPIRY = [
  { value: "24", label: "1日" },
  { value: "72", label: "3日" },
  { value: "168", label: "7日" },
  { value: "720", label: "30日" },
];

export function InviteCreator({ teamId, canInviteCoach }: { teamId: string; canInviteCoach: boolean }) {
  const router = useRouter();
  const [role, setRole] = useState("player");
  const [expires, setExpires] = useState("168");
  const [maxUses, setMaxUses] = useState("30");
  const [created, setCreated] = useState<{ code: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      {canInviteCoach && (
        <ChoiceGroup
          name="invite-role"
          legend="招待する人"
          options={[
            { value: "player", label: "選手" },
            { value: "coach", label: "コーチ" },
          ]}
          value={role}
          onChange={(v) => setRole(v as string)}
        />
      )}
      <ChoiceGroup name="invite-expiry" legend="有効期限" options={EXPIRY} value={expires} onChange={(v) => setExpires(v as string)} />
      <Field
        id="max-uses"
        label="使える回数（1〜100）"
        type="number"
        inputMode="numeric"
        min={1}
        max={100}
        value={maxUses}
        onChange={(e) => setMaxUses(e.target.value)}
      />
      <Button
        block
        disabled={pending}
        onClick={() =>
          start(async () => {
            setCopied(false);
            const r = await createInvite({ teamId, role, expiresHours: Number(expires), maxUses: Number(maxUses) });
            if (!r.ok) return setError(r.error);
            setError(null);
            setCreated(r.data);
            router.refresh();
          })
        }
      >
        招待コードを作る
      </Button>
      <ErrorText error={error} />
      {created && (
        <div className="space-y-2 rounded-xl border border-accent/50 bg-navy-800 p-4">
          <p className="text-sm">招待コード</p>
          <p className="font-mono text-2xl font-black tracking-widest text-accent">{created.code}</p>
          <p className="break-all font-mono text-xs text-ink-muted">{created.url}</p>
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(created.url);
                setCopied(true);
              } catch {
                setError("コピーできませんでした。URLを長押ししてコピーしてください。");
              }
            }}
          >
            {copied ? "コピー済み" : "参加用URLをコピー"}
          </Button>
          <p className="text-xs text-warn">このコードは今だけ表示されます。選手や保護者に伝えてから画面を閉じてください。</p>
        </div>
      )}
    </div>
  );
}

export function AgeBandForm({ current }: { current: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? "");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <ChoiceGroup
        name="account-age-band"
        legend="年代"
        options={AGE_BANDS.map((a) => ({ value: a.value, label: a.label }))}
        value={value}
        onChange={(v) => setValue(v as string)}
      />
      <Button
        block
        variant="secondary"
        disabled={pending || !value || value === current}
        onClick={() =>
          start(async () => {
            const r = await updateMyAgeBand(value);
            setMessage(r.ok ? { ok: true, text: "保存しました。" } : { ok: false, text: r.error });
            if (r.ok) router.refresh();
          })
        }
      >
        年代を保存
      </Button>
      {message && (
        <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm text-accent" : "text-sm text-danger"}>
          {message.text}
        </p>
      )}
    </div>
  );
}
