"use client";
import { useEffect, useState } from "react";
import { getResult, type StoredResult } from "@/lib/storage";
import { getMyResult } from "@/app/actions/account";

export type ResultSource = "local" | "account";
export type LoadedEntry = { entry: StoredResult; source: ResultSource };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** この端末の結果を探し、なければ（ログイン中なら）アカウントの結果を取得する */
export function useResultEntry(id: string, accountEnabled: boolean) {
  const [state, setState] = useState<LoadedEntry | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    const local = getResult(id);
    if (local) {
      setState({ entry: local, source: "local" });
      return;
    }
    if (!accountEnabled || !UUID.test(id)) {
      setState(null);
      return;
    }
    getMyResult(id)
      .then((r) => {
        if (alive) setState(r.ok && r.data ? { entry: r.data, source: "account" } : null);
      })
      .catch(() => alive && setState(null));
    return () => {
      alive = false;
    };
  }, [id, accountEnabled]);
  return state;
}
