"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteAllLocalData } from "@/lib/storage";

export function DeleteLocalData() {
  const [done, setDone] = useState(false);
  return (
    <div className="space-y-2">
      <p className="text-ink-muted">途中保存中の回答と、この端末に保存されたすべての診断結果を削除します。</p>
      <Button
        variant="danger"
        block
        onClick={() => {
          if (!window.confirm("この端末の診断データをすべて削除します。元に戻せません。よろしいですか？")) return;
          deleteAllLocalData();
          setDone(true);
        }}
      >
        すべて削除する
      </Button>
      {done && (
        <p role="status" className="text-accent">
          削除しました。
        </p>
      )}
    </div>
  );
}
