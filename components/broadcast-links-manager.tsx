"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: Date;
  league: string;
  status: string;
  currentUrl: string | null;
  fnlMatchUrl: string | null;
  broadcastMatchMode: string;
};

export function BroadcastLinksManager({
  matches,
  onRefresh
}: {
  matches: Match[];
  onRefresh?: () => void;
}) {
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const activeMatch = matches.find((m) => m.id === activeMatchId);

  function handleUrlChange(matchId: string, url: string) {
    setUrls((prev) => ({
      ...prev,
      [matchId]: url
    }));
  }

  function submit(matchId: string, action: "confirm" | "replace" | "reject") {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/matches/${matchId}/broadcast`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            action,
            broadcastUrl: urls[matchId] || undefined,
            lock: true
          })
        });

        const payload = (await response.json()) as { message: string };
        setMessages((prev) => ({
          ...prev,
          [matchId]: payload.message
        }));

        if (response.ok) {
          setUrls((prev) => {
            const updated = { ...prev };
            delete updated[matchId];
            return updated;
          });
          setActiveMatchId(null);
          onRefresh?.();
        }
      } catch (error) {
        setMessages((prev) => ({
          ...prev,
          [matchId]: "Ошибка при обновлении ссылки"
        }));
      }
    });
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Управление ссылками на трансляции</CardTitle>
          <CardDescription>Все матчи уже имеют ссылки на трансляции</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 p-8 text-center text-sm text-muted-foreground">
            Нет матчей, требующих добавления ссылок на трансляции.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Управление ссылками на трансляции</CardTitle>
        <CardDescription>
          {matches.length} матч{matches.length === 1 ? "" : matches.length % 10 === 1 && matches.length % 100 !== 11 ? "" : "ей"} требуют внимания
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 max-h-96 overflow-y-auto">
          {matches.map((match) => (
            <button
              key={match.id}
              onClick={() => setActiveMatchId(activeMatchId === match.id ? null : match.id)}
              className={cn(
                "rounded-2xl border transition-all text-left p-4",
                activeMatchId === match.id
                  ? "border-primary/50 bg-primary/10"
                  : "border-border/70 bg-secondary/20 hover:border-border hover:bg-secondary/30"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{match.league}</div>
                  <div className="mt-2 font-medium text-foreground">
                    {match.homeTeam} - {match.awayTeam}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {new Date(match.kickoffAt).toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </div>
                  {match.currentUrl && (
                    <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                      Текущая ссылка: <a href={match.currentUrl} target="_blank" rel="noreferrer" className="underline">{match.currentUrl.substring(0, 50)}...</a>
                    </div>
                  )}
                </div>
                <div className="text-xs font-medium px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                  {match.broadcastMatchMode === "requires_review" ? "На проверку" : "Без ссылки"}
                </div>
              </div>
            </button>
          ))}
        </div>

        {activeMatch && (
          <div className="space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <div>
              <h4 className="font-medium text-foreground mb-2">
                {activeMatch.homeTeam} - {activeMatch.awayTeam}
              </h4>
              <div className="flex items-center gap-2 text-sm">
                {activeMatch.fnlMatchUrl && (
                  <a
                    href={activeMatch.fnlMatchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Карточка матча <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">Ссылка на трансляцию</label>
              <Input
                value={urls[activeMatch.id] ?? activeMatch.currentUrl ?? ""}
                onChange={(e) => handleUrlChange(activeMatch.id, e.target.value)}
                placeholder="https://vksport.vkvideo.ru/video... или другой URL"
                disabled={isPending}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => submit(activeMatch.id, "confirm")}
                disabled={isPending || !urls[activeMatch.id]}
              >
                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Подтвердить
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => submit(activeMatch.id, "replace")}
                disabled={isPending || !urls[activeMatch.id]}
              >
                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Заменить ссылку
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => submit(activeMatch.id, "reject")}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Отклонить
              </Button>
            </div>

            {messages[activeMatch.id] && (
              <div className="text-xs text-muted-foreground">{messages[activeMatch.id]}</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
