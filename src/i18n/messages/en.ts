import type { Messages } from "./ja";

/** 英語の文言（準備中。まだ公開していない）。ja.ts と同じキーがないと型エラーになる。 */
export const en: Messages = {
  app: {
    name: "FOOTBALL DNA",
    title: "FOOTBALL DNA | Football play-style quiz",
    shortName: "FOOTBALL DNA",
    description:
      "Answer 15 quick questions (or the detailed 40) to see your play style (16 types), 8 play tendencies and positions that may suit you. A tool for self-understanding and conversation.",
  },
  nav: {
    skipToContent: "Skip to content",
    about: "About",
    aboutShort: "About",
    myPage: "My page",
    home: "FOOTBALL DNA home",
  },
  footer: {
    disclaimer:
      "FOOTBALL DNA shows tendencies based on your own answers. It does not measure ability and must not be used to select players.",
    privacy: "Disclaimer & privacy",
    privacyPolicy: "Privacy policy",
    terms: "Terms of use",
  },
  offline: {
    title: "You are offline",
    body: "You are not connected to the internet. Your answers in progress are saved on this device, so you can continue when you are back online.",
    retry: "Try again",
    home: "Home",
  },
  pwa: {
    updateReady: "A new version is available.",
    reload: "Update",
  },
};
