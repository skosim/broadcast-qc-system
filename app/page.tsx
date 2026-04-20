import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { ClubSearchForm } from "@/components/club-search-form";
import { BroadcastReviewQueue } from "@/components/broadcast-review-queue";
import { MetricCard } from "@/components/metric-card";
import { OverviewLeagueRegistry } from "@/components/overview-league-registry";
import { SeasonSwitcher } from "@/components/season-switcher";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
import { SyncControls } from "@/components/sync-controls";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOverviewData } from "@/lib/repository";
import { formatDateTime, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams
}: {
  searchParams?: { season?: string; filter?: string; search?: string };
}) {
  const seasonSlug = searchParams?.season;
  const activeFilter = searchParams?.filter ?? "all";
  const searchValue = searchParams?.search;
  const data = await getOverviewData({
    seasonSlug,
    clubFilter: activeFilter,
    search: searchValue
  });
  const todayMatches = data.todayMatches as Array<{
    id: string;
    league: string;
    kickoffAt: Date;
    status: string;
    homeTeam: string;
    awayTeam: string;
    matchUrl: string | null;
    streamUrl: string | null;
  }>;
  const leagues = data.leagues as Array<{
    leagueCode: string;
    leagueName: string;
    totalClubCount: number;
    groups: Array<{
      groupCode: string;
      groupName: string;
      clubs: Array<{
        id: string;
        slug: string;
        clubName: string;
        stadiumName: string;
        city: string;
        lastUpdated: Date;
        unresolvedIssueCount: number;
        recentIssueCount: number;
        recurringIssueCount: number;
        problemTags: Array<{ code: string; labelRu: string }>;
        hasCameraPlan: boolean;
        nextMatch: {
          opponent: string;
          isHome: boolean;
          kickoffAt: Date;
          status: string;
          matchUrl: string | null;
          streamUrl: string | null;
        } | null;
        lastMatch: {
          opponent: string;
          isHome: boolean;
          kickoffAt: Date;
          status: string;
          matchUrl: string | null;
          streamUrl: string | null;
        } | null;
      }>;
    }>;
  }>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <SectionHeader eyebrow="Обзор" title="Оценка качества трансляции" />
        <SeasonSwitcher seasons={data.seasons} activeSlug={data.season?.slug} basePath="/" extraParams={{ filter: activeFilter }} />
      </div>

      <section className="grid gap-4 xl:grid-cols-3">
        <MetricCard label="Матчи сегодня" value={String(data.kpis.matchesToday)} hint="" />
        <MetricCard
          label="Среднее количество проблем на 1 трансляцию"
          value={data.kpis.avgProblemsPerBroadcast.toFixed(1)}
          hint=""
        />
        <MetricCard
          label="Решено за сезон"
          value={formatPercent(data.kpis.resolvedPercent)}
          hint=""
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="space-y-4">
          <ClubSearchForm
            basePath="/"
            searchValue={searchValue}
            hiddenParams={{ season: data.season?.slug, filter: activeFilter }}
            placeholder="Найти клуб в реестре"
          />
          <OverviewLeagueRegistry leagues={leagues} activeFilter={activeFilter} seasonSlug={data.season?.slug} searchValue={searchValue} />
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Сегодняшние матчи</CardTitle>
              <CardDescription>Лига, статус эфира, ссылки на карточку матча и трансляцию.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {todayMatches.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 p-5 text-sm text-muted-foreground">
                  На сегодня матчи не подтянуты.
                </div>
              ) : null}

              {todayMatches.map((match) => (
                <div key={match.id} className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{match.league}</div>
                      <div className="mt-2 font-medium text-foreground">
                        {match.homeTeam} - {match.awayTeam}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">{formatDateTime(match.kickoffAt)}</div>
                    </div>
                    <StatusBadge status={match.status} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    {match.matchUrl ? (
                      <a href={match.matchUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
                        Карточка матча <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : null}
                    {match.streamUrl ? (
                      <a href={match.streamUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
                        Открыть трансляцию <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">Ссылка на трансляцию пока отсутствует</span>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Операционная сводка</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {[
                ["Обновлено сегодня", data.opsSummary.updatedToday],
                ["Новых проблем сегодня", data.opsSummary.newProblemsToday],
                ["Матчей подтянуто сегодня", data.opsSummary.matchesPulledToday]
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-2xl border border-border/70 bg-secondary/20 px-4 py-3">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-lg font-semibold text-foreground">{value}</span>
                </div>
              ))}

              <div className="pt-2 text-sm text-muted-foreground">
                Быстрый переход: <Link href="/broadcast-statistics" className="text-primary hover:underline">статистика трансляций</Link> и{" "}
                <Link href="/add" className="text-primary hover:underline">добавление новой информации</Link>.
              </div>

              <SyncControls
                seasonSlug={data.season?.slug}
                lastMatchesSyncAt={data.syncMeta.lastMatchesSyncAt ? formatDateTime(data.syncMeta.lastMatchesSyncAt) : null}
                lastBroadcastsSyncAt={data.syncMeta.lastBroadcastsSyncAt ? formatDateTime(data.syncMeta.lastBroadcastsSyncAt) : null}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      <BroadcastReviewQueue items={data.reviewQueue} />
    </div>
  );
}
