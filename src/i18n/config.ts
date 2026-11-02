/**
 * 多言語化の準備。現在は日本語のみ公開。
 * 英語を公開するときは SUPPORTED_LOCALES に "en" を加え、ロケールの決め方（URL の /en など）を決めてから切り替える。
 */
export const SUPPORTED_LOCALES = ["ja"] as const;
export const PREPARED_LOCALES = ["ja", "en"] as const;
export type Locale = (typeof PREPARED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ja";
