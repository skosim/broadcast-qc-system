import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

export function IssueCard({
  issue,
  actions
}: {
  issue: {
    id: string;
    status: string;
    roundLabel: string | null;
    rawDescription: string | null;
    normalizedSummary: string | null;
    createdBy: string | null;
    sourceReference: string | null;
    resolutionComment: string | null;
    match:
      | {
          kickoffAt: Date;
          homeClub: { name: string };
          awayClub: { name: string };
        }
      | null;
    issueTags: Array<{ tag: { labelRu: string } }>;
    history: Array<{ id: string; actorName: string; actionType: string; createdAt: Date; comment: string | null }>;
  };
  actions?: React.ReactNode;
}) {
  return (
    <Card className="bg-card/90">
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {issue.issueTags.map((item) => (
              <Badge key={`${issue.id}-${item.tag.labelRu}`} variant="secondary">
                {item.tag.labelRu}
              </Badge>
            ))}
            {issue.roundLabel ? <Badge variant="outline">{issue.roundLabel}</Badge> : null}
          </div>
          <StatusBadge status={issue.status} />
        </div>
        <CardTitle className="text-base">{issue.normalizedSummary ?? "Проблема трансляции"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-2 text-muted-foreground xl:grid-cols-2">
          <div>Матч: {issue.match ? `${issue.match.homeClub.name} - ${issue.match.awayClub.name}` : "Не определен"}</div>
          <div>Дата матча: {issue.match ? formatDateTime(issue.match.kickoffAt) : "Не определена"}</div>
          <div>Кто внес: {issue.createdBy ?? "Не указано"}</div>
          <div>
            Источник:{" "}
            {issue.sourceReference ? (
              <a href={issue.sourceReference} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                Открыть
              </a>
            ) : (
              "Нет ссылки"
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4 text-foreground">
          {issue.rawDescription ?? "Описание проблемы не заполнено."}
        </div>
        {actions ? <div className="flex flex-wrap justify-end gap-2">{actions}</div> : null}
        {issue.resolutionComment ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            <span className="font-medium">Комментарий по решению:</span> {issue.resolutionComment}
          </div>
        ) : null}
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">История изменений</div>
          <div className="space-y-2">
            {issue.history.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-border/60 bg-secondary/20 px-3 py-2 text-sm text-muted-foreground">
                <span className="text-foreground">{entry.actorName}</span> · {entry.actionType} · {formatDateTime(entry.createdAt)}
                {entry.comment ? ` · ${entry.comment}` : ""}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
