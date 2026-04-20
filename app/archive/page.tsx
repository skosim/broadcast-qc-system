import { SeasonSwitcher } from "@/components/season-switcher";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getArchiveData } from "@/lib/repository";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ArchivePage({
  searchParams
}: {
  searchParams?: { season?: string };
}) {
  const data = await getArchiveData({
    seasonSlug: searchParams?.season
  });
  const issues = data.issues as Array<{
    id: string;
    status: string;
    normalizedSummary: string | null;
    club: { name: string };
    match: { homeClub: { name: string }; awayClub: { name: string } } | null;
    issueTags: Array<{ tag: { id: string; labelRu: string } }>;
    resolvedAt: Date | null;
    resolvedBy: string | null;
    resolutionType: string | null;
    resolutionSource: string | null;
    resolutionComment: string | null;
  }>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <SectionHeader
          eyebrow="Архив"
          title="Архив решённых проблем"
        />
        <SeasonSwitcher seasons={data.seasons} activeSlug={data.season?.slug} basePath="/archive" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Закрытые записи</CardTitle>
          <CardDescription>Любая проблема из рабочего потока может быть переведена в статус «решена» и затем попасть в архив.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {issues.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 p-5 text-sm text-muted-foreground">
              В архиве пока нет записей за выбранный сезон.
            </div>
          ) : null}

          {issues.map((issue) => (
            <div key={issue.id} className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {issue.issueTags.map((item) => (
                      <Badge key={`${issue.id}-${item.tag.id}`} variant="secondary">
                        {item.tag.labelRu}
                      </Badge>
                    ))}
                  </div>
                  <div className="font-medium text-foreground">{issue.normalizedSummary ?? "Проблема трансляции"}</div>
                  <div className="text-sm text-muted-foreground">
                    {issue.club.name}
                    {issue.match ? ` · ${issue.match.homeClub.name} - ${issue.match.awayClub.name}` : ""}
                  </div>
                </div>
                <StatusBadge status={issue.status} />
              </div>

              <div className="mt-4 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                <div>Закрыто: {formatDateTime(issue.resolvedAt)}</div>
                <div>Кем: {issue.resolvedBy ?? "Не указано"}</div>
                <div>Тип решения: {issue.resolutionType ?? "Не указан"}</div>
                <div>Источник решения: {issue.resolutionSource ?? "Не указан"}</div>
              </div>

              {issue.resolutionComment ? (
                <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                  {issue.resolutionComment}
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
