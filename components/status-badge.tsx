import { Badge } from "@/components/ui/badge";
import { issueStatusLabels, matchStatusLabels, syncStatusLabels } from "@/lib/constants";

const variants: Record<string, "success" | "warning" | "danger" | "secondary" | "info"> = {
  new: "warning",
  in_review: "info",
  resolved: "success",
  archived: "secondary",
  upcoming: "warning",
  live: "info",
  finished: "secondary",
  queued: "warning",
  processing: "info",
  completed: "success",
  failed: "danger",
  parsed: "success",
  needs_review: "secondary"
};

export function StatusBadge({ status }: { status: string }) {
  const label = issueStatusLabels[status] ?? matchStatusLabels[status] ?? syncStatusLabels[status] ?? status;
  return <Badge variant={variants[status] ?? "secondary"}>{label}</Badge>;
}
