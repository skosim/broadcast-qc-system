"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function SyncControls({
  seasonSlug,
  lastMatchesSyncAt,
  lastBroadcastsSyncAt
}: {
  seasonSlug?: string;
  lastMatchesSyncAt?: string | null;
  lastBroadcastsSyncAt?: string | null;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("Синхронизация запускается вручную по кнопке.");
  const [isPending, startTransition] = useTransition();

  async function runSync(kind: "matches" | "broadcasts") {
    startTransition(async () => {
      const response = await fetch(`/api/sync/${kind}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          seasonSlug
        })
      });

      const payload = (await response.json()) as { message: string };
      setMessage(payload.message);
      if (response.ok) {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-secondary/20 p-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => runSync("matches")} disabled={isPending}>
          Обновить матчи из ФНЛ
        </Button>
        <Button type="button" variant="outline" onClick={() => runSync("broadcasts")} disabled={isPending}>
          Обновить ссылки на трансляции
        </Button>
      </div>
      <div className="space-y-1 text-sm text-muted-foreground">
        <div>Последнее обновление матчей: {lastMatchesSyncAt ?? "Пока не запускалось"}</div>
        <div>Последнее обновление ссылок: {lastBroadcastsSyncAt ?? "Пока не запускалось"}</div>
      </div>
      <div className="text-sm text-muted-foreground">{message}</div>
    </div>
  );
}
