import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";

export function AccountUnavailable() {
  return (
    <Card className="space-y-3 text-center">
      <h1 className="text-xl font-bold">アカウント機能は準備中です</h1>
      <p className="text-sm text-ink-muted">
        このサイトではログイン機能がまだ有効になっていません。診断はログインなしで利用でき、結果はこの端末に保存されます。
      </p>
      <LinkButton href="/" block>
        トップへ
      </LinkButton>
    </Card>
  );
}
