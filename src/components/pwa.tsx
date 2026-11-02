"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/** 本番ビルドでだけ Service Worker を登録する（開発中のキャッシュ混乱を避ける） */
export function ServiceWorkerRegister({ updateLabel, reloadLabel }: { updateLabel: string; reloadLabel: string }) {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const updateRequested = useRef(false);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let reg: ServiceWorkerRegistration | undefined;
    const onReady = (r: ServiceWorkerRegistration) => {
      reg = r;
      if (r.waiting && navigator.serviceWorker.controller) setWaiting(r.waiting);
      r.addEventListener("updatefound", () => {
        const sw = r.installing;
        sw?.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) setWaiting(sw);
        });
      });
    };
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(onReady).catch(() => {});
    // 初回インストール時（clients.claim）は再読み込みしない。利用者が「更新する」を押したときだけ再読み込みする
    let reloaded = false;
    const onChange = () => {
      if (reloaded || !updateRequested.current) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onChange);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onChange);
      void reg;
    };
  }, []);
  if (!waiting) return null;
  return (
    <div role="status" className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-xl items-center justify-between gap-3 border-t border-navy-700 bg-navy-900 px-4 py-3 text-sm">
      <span>{updateLabel}</span>
      <Button size="sm" onClick={() => {
          updateRequested.current = true;
          waiting.postMessage({ type: "SKIP_WAITING" });
        }}>
        {reloadLabel}
      </Button>
    </div>
  );
}

export function ReloadButton({ label }: { label: string }) {
  return (
    <Button block onClick={() => window.location.reload()}>
      {label}
    </Button>
  );
}
