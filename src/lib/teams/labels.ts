export const ROLE_LABEL: Record<string, string> = {
  owner: "オーナー",
  coach: "コーチ",
  player: "選手",
  guardian: "保護者",
};

/** 指導者から見た、選手の結果の共有状態 */
export function consentLabel(status: string | null | undefined, needsGuardian: boolean): string {
  switch (status) {
    case "self":
      return needsGuardian ? "保護者の同意が必要（年代が変わったため）" : "共有に同意済み";
    case "guardian_confirmed":
      return "保護者の同意済み";
    case "guardian_pending":
      return "本人は希望・保護者の同意待ち";
    default:
      return "共有していない";
  }
}

export const AUDIT_LABEL: Record<string, string> = {
  team_created: "チームを作成",
  team_deleted: "チームを削除",
  invite_created: "招待コードを作成",
  invite_revoked: "招待コードを取り消し",
  join_requested: "参加を申請",
  member_approved: "参加を承認",
  member_rejected: "参加を却下",
  member_removed: "メンバーを除外",
  member_left: "チームを退会",
  consent_self: "結果の共有に同意",
  consent_none: "結果の共有をやめた",
  consent_guardian_pending: "結果の共有を希望（保護者の同意待ち）",
  consent_guardian_confirmed: "保護者が共有に同意",
  consent_guardian_withdrawn: "保護者が同意を取り消し",
  csv_export: "CSVを出力",
  member_results_viewed: "選手の結果を閲覧",
};
