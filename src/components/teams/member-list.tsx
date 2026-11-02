"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { reviewMember, removeMember } from "@/app/actions/teams";
import { ActionButton } from "@/components/teams/action-button";
import { consentLabel, ROLE_LABEL } from "@/lib/teams/labels";
import { positionLabel, TYPE_CONFIG, typeDef } from "@/lib/scoring/config";
import { POSITION_IDS } from "@/lib/scoring/model";

export type MemberView = {
  id: string;
  role: string;
  memberName: string;
  status: "pending" | "active";
  consentStatus: string;
  needsGuardian: boolean;
  canView: boolean;
  latest: { typeId: string; topPositions: string[]; createdAt: string } | null;
};

const selectClass = "h-11 w-full rounded-xl border border-navy-600 bg-navy-800 px-3 text-sm text-ink";

export function MemberList({ teamId, members, isOwner }: { teamId: string; members: MemberView[]; isOwner: boolean }) {
  const [type, setType] = useState("");
  const [position, setPosition] = useState("");
  const [consent, setConsent] = useState("");

  const pending = members.filter((m) => m.status === "pending");
  const staff = members.filter((m) => m.status === "active" && m.role !== "player");
  const players = useMemo(
    () =>
      members
        .filter((m) => m.status === "active" && m.role === "player")
        .filter((m) => !type || m.latest?.typeId === type)
        .filter((m) => !position || m.latest?.topPositions.includes(position))
        .filter((m) => !consent || (consent === "visible" ? m.canView : !m.canView)),
    [members, type, position, consent],
  );
  const canManage = (m: MemberView) => m.role === "player" || isOwner;

  return (
    <div className="space-y-5">
      {pending.length > 0 && (
        <section aria-labelledby="pending-h" className="space-y-2">
          <h3 id="pending-h" className="font-bold text-warn">
            参加申請（{pending.length}）
          </h3>
          <ul className="space-y-2">
            {pending.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-navy-800 p-3">
                <span>
                  <span className="font-bold">{m.memberName}</span>
                  <span className="ml-2 text-xs text-ink-muted">{ROLE_LABEL[m.role]}</span>
                </span>
                {canManage(m) ? (
                  <span className="flex gap-2">
                    <ActionButton variant="primary" action={() => reviewMember({ teamId, memberId: m.id, approve: true })}>
                      承認
                    </ActionButton>
                    <ActionButton
                      variant="danger"
                      confirm={`${m.memberName} さんの参加申請を却下しますか？`}
                      action={() => reviewMember({ teamId, memberId: m.id, approve: false })}
                    >
                      却下
                    </ActionButton>
                  </span>
                ) : (
                  <span className="text-xs text-ink-muted">オーナーの承認待ち</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="players-h" className="space-y-3">
        <h3 id="players-h" className="font-bold">
          選手
        </h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <label className="text-xs text-ink-muted">
            タイプ
            <select className={selectClass} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">すべて</option>
              {TYPE_CONFIG.types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-ink-muted">
            ポジション候補
            <select className={selectClass} value={position} onChange={(e) => setPosition(e.target.value)}>
              <option value="">すべて</option>
              {POSITION_IDS.map((p) => (
                <option key={p} value={p}>
                  {positionLabel(p)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-ink-muted">
            共有の状態
            <select className={selectClass} value={consent} onChange={(e) => setConsent(e.target.value)}>
              <option value="">すべて</option>
              <option value="visible">結果を見られる</option>
              <option value="hidden">結果を見られない</option>
            </select>
          </label>
        </div>
        {players.length === 0 ? (
          <p className="text-sm text-ink-muted">該当する選手はいません。</p>
        ) : (
          <ul className="space-y-2">
            {players.map((m) => (
              <li key={m.id} className="space-y-2 rounded-xl bg-navy-800 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{m.memberName}</p>
                    <p className="text-xs text-ink-muted">{consentLabel(m.consentStatus, m.needsGuardian)}</p>
                  </div>
                  {m.canView && m.latest ? (
                    <div className="text-right text-sm">
                      <p className="font-bold text-accent">{typeDef(m.latest.typeId).name}</p>
                      <p className="text-xs text-ink-muted">{m.latest.topPositions.join(" / ")}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-ink-muted">{m.canView ? "診断結果なし" : "非表示"}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {m.canView && (
                    <Link
                      href={`/teams/${teamId}/members/${m.id}`}
                      className="inline-flex min-h-9 items-center rounded-xl border border-navy-600 px-3 text-sm font-bold hover:bg-navy-700"
                    >
                      結果の推移を見る
                    </Link>
                  )}
                  <ActionButton
                    variant="ghost"
                    confirm={`${m.memberName} さんをチームから外しますか？`}
                    action={() => removeMember({ teamId, memberId: m.id })}
                  >
                    チームから外す
                  </ActionButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="staff-h" className="space-y-2">
        <h3 id="staff-h" className="font-bold">
          指導者
        </h3>
        <ul className="space-y-2">
          {staff.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded-xl bg-navy-800 p-3 text-sm">
              <span>
                <span className="font-bold">{m.memberName}</span>
                <span className="ml-2 text-xs text-ink-muted">{ROLE_LABEL[m.role]}</span>
              </span>
              {isOwner && m.role === "coach" && (
                <ActionButton
                  variant="ghost"
                  confirm={`${m.memberName} さんをチームから外しますか？`}
                  action={() => removeMember({ teamId, memberId: m.id })}
                >
                  外す
                </ActionButton>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
