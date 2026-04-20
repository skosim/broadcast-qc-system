"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TagCreateForm() {
  const router = useRouter();
  const [message, setMessage] = useState("Новый тег сразу появится в формах добавления проблем.");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3 lg:grid-cols-[1fr_1.4fr_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          const response = await fetch("/api/tags", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              labelRu: formData.get("labelRu"),
              description: formData.get("description")
            })
          });

          const payload = (await response.json()) as { message: string };
          setMessage(payload.message);

          if (response.ok) {
            event.currentTarget.reset();
            router.refresh();
          }
        });
      }}
    >
      <Input name="labelRu" placeholder="Название тега" required />
      <Input name="description" placeholder="Короткое описание для внутренних пользователей" />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Добавляем..." : "Добавить тег"}
      </Button>
      <p className="text-sm text-muted-foreground lg:col-span-3">{message}</p>
    </form>
  );
}
