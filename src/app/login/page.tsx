import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountUnavailable } from "@/components/account-unavailable";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-path";

export const metadata: Metadata = { title: "ログイン", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await getCurrentUser();
  if (!supabase) return <AccountUnavailable />;
  const next = safeNextPath(sp.next);
  if (user) redirect(next);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black">ログイン・新規登録</h1>
        <p className="mt-1 text-sm text-ink-muted">
          メールアドレスにログイン用のリンクを送ります。パスワードは不要です。ログインすると、診断結果を履歴として保存したり、共有リンクを作れます。
        </p>
      </div>
      {sp.error && (
        <p role="alert" className="rounded-xl border border-danger/50 bg-danger/10 p-3 text-sm text-danger">
          ログインに失敗しました。リンクの有効期限が切れている可能性があります。もう一度お試しください。
        </p>
      )}
      <LoginForm next={next} />
      <p className="text-xs leading-relaxed text-ink-muted">
        中学生以下の方は、おうちの人といっしょに登録してください。メールアドレスはログインのためだけに使います。
      </p>
    </div>
  );
}
