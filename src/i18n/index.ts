import { DEFAULT_LOCALE, type Locale } from "./config";
import { en } from "./messages/en";
import { ja, type Messages } from "./messages/ja";

const DICTIONARIES: Record<Locale, Messages> = { ja, en };

/** 文言の辞書を返す。今はロケールの切り替え手段がないため常に日本語。 */
export function getMessages(locale: Locale = DEFAULT_LOCALE): Messages {
  return DICTIONARIES[locale];
}

export { DEFAULT_LOCALE };
export type { Locale, Messages };
