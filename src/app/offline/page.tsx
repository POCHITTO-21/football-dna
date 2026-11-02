import type { Metadata } from "next";
import { getMessages } from "@/i18n";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { ReloadButton } from "@/components/pwa";

export const metadata: Metadata = { title: "オフライン", robots: { index: false } };

export default function OfflinePage() {
  const m = getMessages().offline;
  return (
    <Card className="space-y-4 text-center">
      <h1 className="text-xl font-bold">{m.title}</h1>
      <p className="text-sm text-ink-muted">{m.body}</p>
      <ReloadButton label={m.retry} />
      <LinkButton href="/" variant="secondary" block>
        {m.home}
      </LinkButton>
    </Card>
  );
}
