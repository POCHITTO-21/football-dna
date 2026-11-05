import { Card, CardTitle } from "@/components/ui/card";
import { GUIDE, SOURCES } from "@/lib/nutrition/data";

export function SourceList() {
  return (
    <Card>
      <CardTitle>栄養情報の出典・更新日</CardTitle>
      <ul className="space-y-3 text-sm">
        {SOURCES.map((s) => (
          <li key={s.id}>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-bold text-accent underline underline-offset-2 hover:text-accent-strong">
              {s.title}
            </a>
            <span className="block text-xs text-ink-muted">
              {s.publisher}／確認日 {s.checkedOn}
            </span>
            <span className="block text-xs text-ink-muted">参考にした内容：{s.usedFor}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-ink-muted">
        FOOTBALL DNA 運営事務局が、上の公開資料をもとに作成しました。医師・管理栄養士の監修は受けていません。栄養成分の数値は表示していません。最終更新日 {GUIDE.lastReviewedAt}
      </p>
    </Card>
  );
}
