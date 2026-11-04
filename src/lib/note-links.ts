import { z } from "zod";
import noteLinksJson from "@/data/note-links.json";

// note の記事 URL だけを許可する（設定ミスで別サイトに飛ばさないため）。空欄は「未設定」。
const noteUrl = z.union([z.literal(""), z.string().regex(/^https:\/\/note\.com\/[^\s]+$/)]);

export const noteLinksSchema = z.object({
  membershipUrl: noteUrl,
  types: z.record(z.string().regex(/^T\d{2}$/), noteUrl),
});
export type NoteLinks = z.infer<typeof noteLinksSchema>;

export const NOTE_LINKS: NoteLinks = noteLinksSchema.parse(noteLinksJson);

export type NoteLink = { url: string; forType: boolean };

/** タイプ別の記事 → メンバーシップのトップ の順で探す。どちらも未設定なら null。 */
export function noteLinkFor(typeId: string, links: NoteLinks = NOTE_LINKS): NoteLink | null {
  const typeUrl = links.types[typeId];
  if (typeUrl) return { url: typeUrl, forType: true };
  if (links.membershipUrl) return { url: links.membershipUrl, forType: false };
  return null;
}
