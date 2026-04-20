"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BroadcastReviewActions({
  matchId,
  currentUrl
}: {
  matchId: string;
  currentUrl?: string | null;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(currentUrl ?? "");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(action: "confirm" | "replace" | "reject") {
    startTransition(async () => {
      const response = await fetch(`/api/matches/${matchId}/broadcast`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action,
          broadcastUrl: url || undefined,
          lock: true
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
    <div className="space-y-3 rounded-2xl border border-border/70 bg-background/40 p-4">
      <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Ссылка на трансляцию" />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => submit("confirm")} disabled={isPending}>
          Подтвердить
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => submit("replace")} disabled={isPending}>
          Заменить ссылку
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => submit("reject")} disabled={isPending}>
          Отклонить
        </Button>
      </div>
      {message ? <div className="text-xs text-muted-foreground">{message}</div> : null}
    </div>
  );
}
