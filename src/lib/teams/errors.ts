/** DB 関数が返すエラーコードを画面用の日本語に変換する */
const MESSAGES: Record<string, string> = {
  not_authenticated: "ログインが必要です。",
  forbidden: "この操作を行う権限がありません。",
  invalid_input: "入力内容が正しくありません。",
  coach_must_be_adult: "チームの作成・指導者としての参加は、年代が18歳以上の方のみできます。プライバシー設定で年代を確認してください。",
  too_many_teams: "作成できるチームの数の上限に達しています。",
  invite_invalid: "招待コードが正しくないか、期限切れ・使用回数の上限・取り消し済みです。指導者に新しいコードをもらってください。",
  already_member: "すでにこのチームに参加（または参加申請）しています。",
  owner_cannot_leave: "オーナーはチームを退会できません。チームを削除してください。",
  too_many_requests: "操作が多すぎます。少し時間をおいてお試しください。",
  guardian_must_be_adult: "保護者として登録できるのは18歳以上の方です。",
  guardian_request_invalid: "この保護者確認リンクは無効です（期限切れ・使用済み）。お子さんに新しいリンクを発行してもらってください。",
  guardian_self: "自分自身を保護者として登録することはできません。別の大人のアカウントで開いてください。",
  child_has_not_requested: "お子さん本人がチームへの共有を希望していないため、同意できません。",
};

export function dbErrorMessage(error: { message?: string } | null | undefined, fallback = "操作に失敗しました。"): string {
  const msg = error?.message ?? "";
  for (const [code, text] of Object.entries(MESSAGES)) if (msg.includes(code)) return text;
  return fallback;
}
