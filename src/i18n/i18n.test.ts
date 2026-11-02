import { describe, expect, it } from "vitest";
import { ja } from "./messages/ja";
import { en } from "./messages/en";
import { getMessages } from "./index";

function keys(o: object, prefix = ""): string[] {
  return Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [prefix + k] : keys(v, `${prefix}${k}.`)));
}

describe("i18n", () => {
  it("英語と日本語のキーが一致し、空の文言がない", () => {
    expect(keys(en).sort()).toEqual(keys(ja).sort());
    for (const dict of [ja, en]) {
      for (const k of keys(dict)) {
        const v = k.split(".").reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], dict);
        expect(String(v).trim().length, k).toBeGreaterThan(0);
      }
    }
  });
  it("既定は日本語", () => {
    expect(getMessages().nav.about).toBe("この診断について");
  });
});
