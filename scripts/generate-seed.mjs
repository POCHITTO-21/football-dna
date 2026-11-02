// src/data/questions.v1.json から Supabase 用の seed SQL を生成する。
// 使い方: node scripts/generate-seed.mjs > supabase/seed.sql
import { readFileSync } from "node:fs";

const qs = JSON.parse(readFileSync(new URL("../src/data/questions.v1.json", import.meta.url), "utf8"));
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;
const lines = [
  "-- 自動生成: node scripts/generate-seed.mjs > supabase/seed.sql （手で編集しない）",
  `insert into public.question_sets (version, published_at) values (${lit(qs.version)}, now()) on conflict (version) do nothing;`,
  "insert into public.questions (id, question_set_id, axis, text, kids_text, display_order)",
  `select v.id, qs.id, v.axis, v.text, v.kids_text, v.display_order from public.question_sets qs, (values`,
  qs.questions
    .map((q) => `  (${lit(q.id)}, ${lit(q.axis)}, ${lit(q.text)}, ${lit(q.kidsText)}, ${q.order})`)
    .join(",\n"),
  `) as v(id, axis, text, kids_text, display_order) where qs.version = ${lit(qs.version)}`,
  "on conflict do nothing;",
];
console.log(lines.join("\n"));
