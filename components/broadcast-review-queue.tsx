import { ExternalLink } from "lucide-react";
import { BroadcastReviewActions } from "@/components/broadcast-review-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/utils";

type ReviewItem = {
  id: string;
  kickoffAt: Date;
  fnlMatchUrl: string | null;
  broadcastUrl: string | null;
  broadcastReviewReason: string | null;
  status: string;
  homeClub: { name: string };
  awayClub: { name: string };
};

export function BroadcastReviewQueue({ items }: { items: ReviewItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Очередь проверки ссылок</CardTitle>
        <CardDescription>Только спорные случаи, которые не прошли auto-first сопоставление.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 p-5 text-sm text-muted-foreground">
            Спорных кейсов по ссылкам на трансляции сейчас нет.
          </div>
        ) : null}

        {items.map((item) => (
          <div key={item.id} className="space-y-3 rounded-2xl border border-border/70 bg-secondary/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-medium text-foreground">
                  {item.homeClub.name} - {item.awayClub.name}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{formatDateTime(item.kickoffAt)}</div>
                <div className="mt-2 text-sm text-muted-foreground">{item.broadcastReviewReason ?? "Нужна ручная проверка."}</div>
              </div>
              <StatusBadge status={item.status} />
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              {item.fnlMatchUrl ? (
                <a href={item.fnlMatchUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
                  Карточка матча <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
              {item.broadcastUrl ? (
                <a href={item.broadcastUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
                  Кандидатная трансляция <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
            </div>

            <BroadcastReviewActions matchId={item.id} currentUrl={item.broadcastUrl} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
