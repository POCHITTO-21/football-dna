/** 画面共通の文言（日本語）。キーを増やしたら en.ts にも同じキーが必要（型で強制）。 */
export const ja = {
  app: {
    name: "FOOTBALL DNA",
    title: "FOOTBALL DNA｜サッカー プレースタイル診断",
    shortName: "FOOTBALL DNA",
    description:
      "40問の質問から、あなたのプレースタイル（16タイプ）、8つのプレー志向、ポジションの可能性がわかるサッカー診断。自己理解と対話のためのツールです。",
  },
  nav: {
    skipToContent: "本文へスキップ",
    about: "この診断について",
    aboutShort: "診断とは",
    myPage: "マイページ",
    home: "FOOTBALL DNA トップへ",
  },
  footer: {
    disclaimer:
      "FOOTBALL DNA は自己回答にもとづくプレー志向の傾向を示すもので、運動能力の測定や選手選抜の判断に使うものではありません。",
    privacy: "免責事項・プライバシー",
    privacyPolicy: "プライバシーポリシー",
    terms: "利用規約",
  },
  offline: {
    title: "オフラインです",
    body: "インターネットにつながっていません。診断の途中の回答はこの端末に保存されているので、つながったら続きから再開できます。",
    retry: "もう一度読み込む",
    home: "トップへ",
  },
  pwa: {
    updateReady: "新しいバージョンがあります。",
    reload: "更新する",
  },
} as const;

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type Messages = Widen<typeof ja>;
