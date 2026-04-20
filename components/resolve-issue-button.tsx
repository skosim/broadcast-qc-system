"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function ResolveIssueButton({ issueId }: { issueId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      {message ? <span className="text-xs text-muted-foreground">{message}</span> : null}
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            const response = await fetch(`/api/issues/${issueId}/resolve`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                resolvedBy: "Внутренний пользователь",
                resolutionType: "ручное подтверждение",
                resolutionComment: "Проблема отмечена решенной через интерфейс клуба."
              })
            });

            const payload = (await response.json()) as { message: string };
            setMessage(payload.message);

            if (response.ok) {
              router.refresh();
            }
          });
        }}
      >
        {isPending ? "Сохраняем..." : "Пометить решенной"}
      </Button>
    </div>
  );
}
