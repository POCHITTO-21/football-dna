import { describe, expect, it } from "vitest";
import { NOTE_LINKS, noteLinkFor, noteLinksSchema } from "./note-links";
import { TYPE_CONFIG } from "./scoring/config";

const empty = { membershipUrl: "", types: {} };

describe("note リンク設定", () => {
  it("設定ファイルは16タイプすべての枠を持つ", () => {
    for (const t of TYPE_CONFIG.types) expect(t.id in NOTE_LINKS.types).toBe(true);
  });

  it("どちらも未設定なら表示しない", () => {
    expect(noteLinkFor("T01", empty)).toBeNull();
  });

  it("タイプ別の記事を優先し、なければメンバーシップのトップを使う", () => {
    const links = { membershipUrl: "https://note.com/x/membership", types: { T01: "https://note.com/x/n/abc" } };
    expect(noteLinkFor("T01", links)).toEqual({ url: "https://note.com/x/n/abc", forType: true });
    expect(noteLinkFor("T02", links)).toEqual({ url: "https://note.com/x/membership", forType: false });
  });

  it("note 以外の URL は設定エラーにする", () => {
    expect(() => noteLinksSchema.parse({ membershipUrl: "https://evil.example/", types: {} })).toThrow();
    expect(() => noteLinksSchema.parse({ membershipUrl: "http://note.com/x", types: {} })).toThrow();
  });
});
