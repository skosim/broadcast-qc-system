import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clubQuickFilters } from "@/lib/constants";
import { FilterLinkGroup } from "@/components/filter-link-group";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/utils";

type LeagueRegistryData = {
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
  };

export function OverviewLeagueRegistry({
  leagues,
  activeFilter,
  seasonSlug,
  searchValue
}: {
  leagues: LeagueRegistryData[];
  activeFilter: string;
  seasonSlug?: string;
  searchValue?: string;
}) {
  return (
    <Card className="min-h-[640px]">
      <CardHeader className="space-y-4">
        <div>
          <CardTitle>Реестр по лигам</CardTitle>
        </div>
        <FilterLinkGroup
          items={clubQuickFilters}
          activeKey={activeFilter}
          basePath="/"
          paramName="filter"
          extraParams={{ season: seasonSlug, search: searchValue }}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {leagues.map((league) => (
          <details
            key={league.leagueCode}
            open
            className="rounded-2xl border border-border/80 bg-secondary/40 p-4"
          >
            <summary className="cursor-pointer list-none text-lg font-semibold text-foreground">
              {league.leagueName}
              <span className="ml-3 text-sm font-normal text-muted-foreground">{league.totalClubCount} клубов</span>
            </summary>

            <div className="mt-4 space-y-3">
              {league.groups.map((group) => (
                <div key={`${league.leagueCode}-${group.groupCode}`} className="space-y-3">
                  {league.groups.length > 1 ? (
                    <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-2 text-sm font-medium text-foreground">
                      {group.groupName}
                      <span className="ml-2 text-muted-foreground">{group.clubs.length}</span>
                    </div>
                  ) : null}

                  {group.clubs.map((club) => (
                    <div
                      key={club.id}
                      className="grid gap-3 rounded-2xl border border-border/60 bg-card/80 p-4 xl:grid-cols-[1.15fr_0.95fr_1.15fr_1.1fr]"
                    >
                      <div className="space-y-1">
                        <Link href={`/clubs/${club.slug}${seasonSlug ? `?season=${seasonSlug}` : ""}`} className="text-base font-semibold text-primary hover:underline">
                          {club.clubName}
                        </Link>
                        <div className="text-sm text-muted-foreground">{club.stadiumName}</div>
                        <div className="text-sm text-muted-foreground">{club.city}</div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {club.problemTags.length ? (
                          club.problemTags.map((tag) => (
                            <Link
                              key={tag.code}
                              href={`/broadcast-statistics?${new URLSearchParams(
                                Object.fromEntries(
                                  Object.entries({
                                    ...(seasonSlug ? { season: seasonSlug } : {}),
                                    tag: tag.code
                                  }).filter(([, value]) => value)
                                )
                              ).toString()}`}
                            >
                              <Badge variant="secondary" className="cursor-pointer hover:border-primary/40 hover:text-primary">
                                {tag.labelRu}
                              </Badge>
                            </Link>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Теги пока не назначены</span>
                        )}
                      </div>

                      <div className="space-y-3 text-sm text-muted-foreground">
                        <div>Обновление: {formatDateTime(club.lastUpdated)}</div>
                        <div>Кол-во проблем за 3 последних матча: {club.recentIssueCount}</div>
                        <div>Нерешенные проблемы: {club.unresolvedIssueCount}</div>
                      </div>

                      <div className="space-y-3">
                        <div className="rounded-2xl border border-border/60 bg-background/50 p-3">
                          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Следующий матч</div>
                          {club.nextMatch ? (
                            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                              <div className="font-medium text-foreground">
                                {club.nextMatch.isHome ? "Дома" : "В гостях"} · {club.nextMatch.opponent}
                              </div>
                              <div>{formatDateTime(club.nextMatch.kickoffAt)}</div>
                              <div className="pt-1"><StatusBadge status={club.nextMatch.status} /></div>
                              <div className="flex flex-wrap gap-3 pt-1">
                                {club.nextMatch.matchUrl ? (
                                  <a href={club.nextMatch.matchUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                    Матч ФНЛ
                                  </a>
                                ) : null}
                                {club.nextMatch.streamUrl ? (
                                  <a href={club.nextMatch.streamUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                    Трансляция
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2 text-sm text-muted-foreground">Пока не найден</div>
                          )}
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-background/50 p-3">
                          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Последний матч</div>
                          {club.lastMatch ? (
                            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                              <div className="font-medium text-foreground">
                                {club.lastMatch.isHome ? "Дома" : "В гостях"} · {club.lastMatch.opponent}
                              </div>
                              <div>{formatDateTime(club.lastMatch.kickoffAt)}</div>
                              <div className="pt-1"><StatusBadge status={club.lastMatch.status} /></div>
                              <div className="flex flex-wrap gap-3 pt-1">
                                {club.lastMatch.matchUrl ? (
                                  <a href={club.lastMatch.matchUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                    Матч ФНЛ
                                  </a>
                                ) : null}
                                {club.lastMatch.streamUrl ? (
                                  <a href={club.lastMatch.streamUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                    Трансляция
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2 text-sm text-muted-foreground">Пока не найден</div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {club.recurringIssueCount > 0 ? <Badge variant="warning">Повторяющиеся: {club.recurringIssueCount}</Badge> : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {league.groups.every((group) => group.clubs.length === 0) ? (
                <div className="text-sm text-muted-foreground">Под выбранный фильтр клубы не найдены.</div>
              ) : null}
            </div>
          </details>
        ))}
      </CardContent>
    </Card>
  );
}
