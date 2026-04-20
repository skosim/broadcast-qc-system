import { BarChartPanel } from "@/components/charts/bar-chart-panel";
import { HeatmapPanel } from "@/components/charts/heatmap-panel";
import { LineChartPanel } from "@/components/charts/line-chart-panel";
import { FilterLinkGroup } from "@/components/filter-link-group";
import { SeasonSwitcher } from "@/components/season-switcher";
import { SectionHeader } from "@/components/section-header";
import { leagueFilterItems } from "@/lib/constants";
import { getBroadcastStatistics } from "@/lib/repository";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function BroadcastStatisticsPage({
  searchParams
}: {
  searchParams?: { season?: string; league?: string; tag?: string };
}) {
  const leagueCode = searchParams?.league ?? "all";
  const activeTag = searchParams?.tag;
  const data = await getBroadcastStatistics({
    seasonSlug: searchParams?.season,
    leagueCode,
    tagCode: activeTag
  });
  const tagStats = data.tagStats as Array<{ name: string; value: number; clubs?: string[] }>;
  const roundStats = data.roundStats as Array<{ name: string; value: number; clubs?: string[] }>;
  const clubStats = data.clubStats as Array<{ name: string; value: number }>;
  const heatmap = data.heatmap as Array<{ club: string; tags: Array<{ tag: string; value: number }> }>;
  const tagRoundMatrix = data.tagRoundMatrix as Array<{ club: string; tags: Array<{ tag: string; value: number }> }>;
  const recurring = data.recurring as Array<{ name: string; value: number }>;
  const leagueSplit = data.leagueSplit as Array<{ name: string; value: number }>;
  const issueSamples = data.issueSamples as Array<{
    id: string;
    clubName: string;
    leagueName: string;
    roundLabel: string;
    description: string;
  }>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <SectionHeader
          eyebrow="Статистика"
          title="Статистика по трансляциям"
        />
        <SeasonSwitcher
          seasons={data.seasons}
          activeSlug={data.season?.slug}
          basePath="/broadcast-statistics"
          extraParams={{ league: leagueCode, tag: activeTag }}
        />
      </div>

      <FilterLinkGroup
        items={leagueFilterItems.map((item) => ({ key: item.code, label: item.label }))}
        activeKey={leagueCode}
        basePath="/broadcast-statistics"
        paramName="league"
        extraParams={{ season: data.season?.slug, tag: activeTag }}
      />

      {activeTag ? (
        <Card>
          <CardHeader>
            <CardTitle>Фильтр по тегу</CardTitle>
            <CardDescription>
              Показана статистика только по тегу <span className="text-foreground">{activeTag}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-3">
              <div className="text-sm font-medium text-foreground">Варьируется между лигами</div>
              {leagueSplit.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-2xl border border-border/70 bg-secondary/20 px-4 py-3">
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                  <span className="font-semibold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium text-foreground">Примеры описаний</div>
              {issueSamples.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
                  <div className="text-sm text-muted-foreground">
                    {item.clubName} · {item.leagueName} · {item.roundLabel}
                  </div>
                  <div className="mt-2 text-sm text-foreground">{item.description}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-2">
        <BarChartPanel
          title="Самые частые теги"
          description="Какие типы проблем встречаются чаще всего."
          data={tagStats.slice(0, 8)}
        />
        <LineChartPanel
          title="Проблемы по турам"
          description="Туры, где накапливается больше всего инцидентов по трансляциям."
          data={roundStats.slice(0, 10)}
        />
      </section>

      <section className="grid gap-6">
        <HeatmapPanel
          title="Матрица клуб × тег"
          description="Плотность инцидентов по клубам и типам проблем."
          rows={heatmap}
        />

        <HeatmapPanel
          title="Матрица тег × тур"
          description="Плотность появления тегов по турам."
          rows={tagRoundMatrix}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Рейтинг клубов по проблемности</CardTitle>
          <CardDescription>Клубы с наибольшим числом зафиксированных проблем в эфире.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Клуб</TableHead>
                <TableHead>Проблем</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clubStats.map((club) => (
                <TableRow key={club.name}>
                  <TableCell>{club.name}</TableCell>
                  <TableCell>{club.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Хронические проблемы</CardTitle>
          <CardDescription>Инциденты, которые возвращаются в течение сезона и требуют отдельного контроля.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {recurring.length === 0 ? (
            <div className="text-sm text-muted-foreground">Повторяющиеся проблемы пока не выделены.</div>
          ) : null}
          {recurring.map((item) => (
            <div key={item.name} className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
              <div className="font-medium text-foreground">{item.name}</div>
              <div className="mt-1 text-sm text-muted-foreground">Повторений: {item.value}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
