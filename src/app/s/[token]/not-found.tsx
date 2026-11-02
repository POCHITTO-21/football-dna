import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Card className="space-y-3 text-center">
      <h1 className="text-xl font-bold">このリンクは表示できません</h1>
      <p className="text-sm text-ink-muted">共有が停止されたか、期限が切れたか、URLが間違っている可能性があります。</p>
      <LinkButton href="/" block>
        トップへ
      </LinkButton>
    </Card>
  );
}
