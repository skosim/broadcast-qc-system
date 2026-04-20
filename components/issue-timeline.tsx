import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/utils";

export function IssueTimeline({
  issues
}: {
  issues: Array<{
    id: string;
    status: string;
    normalizedSummary: string | null;
    createdAt: Date;
    match:
      | {
          homeClub: { name: string };
          awayClub: { name: string };
        }
      | null;
  }>;
}) {
  return (
    <div className="space-y-4">
      {issues.map((issue) => (
        <div key={issue.id} className="grid gap-4 rounded-2xl border border-border/70 bg-card/80 p-4 xl:grid-cols-[140px_1fr_auto]">
          <div className="text-sm text-muted-foreground">{formatDateTime(issue.createdAt)}</div>
          <div>
            <div className="font-medium text-foreground">{issue.normalizedSummary ?? "Проблема трансляции"}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {issue.match ? `${issue.match.homeClub.name} - ${issue.match.awayClub.name}` : "Матч не определен"}
            </div>
          </div>
          <StatusBadge status={issue.status} />
        </div>
      ))}
    </div>
  );
}
