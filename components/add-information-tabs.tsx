"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ClubOption = {
  id: string;
  name: string;
  league: string;
  stadium: string | null;
};

type TagOption = {
  id: string;
  labelRu: string;
};

export function AddInformationTabs({
  clubs,
  tags,
  preselectedClubId
}: {
  clubs: ClubOption[];
  tags: TagOption[];
  preselectedClubId?: string;
}) {
  const [activeTab, setActiveTab] = useState<"issue" | "file">("issue");
  const [message, setMessage] = useState("Форма готова к работе.");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {[
          { key: "issue", label: "Добавить проблему трансляции" },
          { key: "file", label: "Добавить стадионный файл" }
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as "issue" | "file")}
            className={cn(
              "rounded-full border px-3 py-2 text-sm transition",
              activeTab === tab.key
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border/80 bg-secondary/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "issue" ? (
        <Card>
          <CardHeader>
            <CardTitle>Добавить проблему трансляции</CardTitle>
            <CardDescription>Лига, группа, сезон и последняя доступная привязка к матчу определяются автоматически по клубу.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);

                startTransition(async () => {
                  const response = await fetch("/api/issues", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                      clubId: data.get("clubId"),
                      tagId: data.get("tagId"),
                      rawDescription: data.get("rawDescription"),
                      createdBy: data.get("createdBy"),
                      sourceReference: data.get("sourceReference")
                    })
                  });

                  const payload = (await response.json()) as { message: string };
                  setMessage(payload.message);
                  if (response.ok) {
                    event.currentTarget.reset();
                  }
                });
              }}
            >
              <SelectField
                label="Клуб"
                name="clubId"
                required
                defaultValue={preselectedClubId ?? ""}
                options={clubs.map((club) => ({
                  value: club.id,
                  label: `${club.name} · ${club.league}`
                }))}
              />
              <SelectField
                label="Тег"
                name="tagId"
                defaultValue=""
                options={[{ value: "", label: "Без тега" }, ...tags.map((tag) => ({ value: tag.id, label: tag.labelRu }))]}
              />
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">Описание проблемы</label>
                <Textarea name="rawDescription" placeholder="Полное описание проблемы без сокращений" />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-foreground">Кто внес</label>
                  <Input name="createdBy" placeholder="Например: Оператор ФНЛ" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-foreground">Ссылка на источник</label>
                  <Input name="sourceReference" placeholder="https://..." />
                </div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">{message}</p>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Сохраняем..." : "Сохранить проблему"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Добавить стадионный файл</CardTitle>
            <CardDescription>Файл будет сохранен, а система создаст черновой результат обработки для последующего подтверждения.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);

                startTransition(async () => {
                  const response = await fetch("/api/upload", {
                    method: "POST",
                    body: data
                  });

                  const payload = (await response.json()) as { message: string };
                  setMessage(payload.message);
                  if (response.ok) {
                    event.currentTarget.reset();
                  }
                });
              }}
            >
              <SelectField
                label="Клуб"
                name="clubId"
                required
                defaultValue={preselectedClubId ?? ""}
                options={clubs.map((club) => ({
                  value: club.id,
                  label: `${club.name} · ${club.stadium ?? "Стадион не задан"}`
                }))}
              />
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">Файл</label>
                <Input type="file" name="file" required />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">Комментарий</label>
                <Textarea name="comment" placeholder="Необязательный комментарий к файлу" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">{message}</p>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Загружаем..." : "Загрузить файл"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
  required
}: {
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  defaultValue: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <select
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="flex h-10 w-full rounded-xl border border-input bg-secondary px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        {!required ? <option value="">Не выбрано</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
