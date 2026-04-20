import { BarChartPanel } from "@/components/charts/bar-chart-panel";
import { FilterLinkGroup } from "@/components/filter-link-group";
import { SeasonSwitcher } from "@/components/season-switcher";
import { SectionHeader } from "@/components/section-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { leagueFilterItems } from "@/lib/constants";
import { getStadiumStatistics } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function StadiumStatisticsPage({
  searchParams
}: {
  searchParams?: { season?: string; league?: string };
}) {
  const leagueCode = searchParams?.league ?? "all";
  const data = await getStadiumStatistics({
    seasonSlug: searchParams?.season,
    leagueCode
  });
  const tagStats = data.tagStats as Array<{ name: string; value: number }>;
  const leagueStats = data.leagueStats as Array<{ name: string; value: number }>;
  const rows = data.rows as Array<{
    clubName: string;
    stadiumName: string;
    leagueName: string;
    issueCount: number;
    cameraPlanCount: number;
    galleryCount: number;
    tags: Array<{ name: string; value: number }>;
  }>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <SectionHeader
          eyebrow="Стадионы"
          title="Статистика по стадионам"
        />
        <SeasonSwitcher seasons={data.seasons} activeSlug={data.season?.slug} basePath="/stadium-statistics" extraParams={{ league: leagueCode }} />
      </div>

      <FilterLinkGroup
        items={leagueFilterItems.map((item) => ({ key: item.code, label: item.label }))}
        activeKey={leagueCode}
        basePath="/stadium-statistics"
        paramName="league"
        extraParams={{ season: data.season?.slug }}
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <BarChartPanel
          title="Проблемы по стадионным тегам"
          description="Какие типы замечаний чаще всего встречаются в стадионном контуре."
          data={tagStats.slice(0, 8)}
        />
        <BarChartPanel
          title="Разбивка по лигам"
          description="Сколько проблемных стадионных карточек приходится на каждую лигу."
          data={leagueStats}
          barColor="#84e1a4"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Рейтинг клубов и стадионов</CardTitle>
          <CardDescription>Самые проблемные стадионы без динамики по обновлениям, только текущее накопленное состояние.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Клуб</TableHead>
                <TableHead>Стадион</TableHead>
                <TableHead>Лига</TableHead>
                <TableHead>Замечаний</TableHead>
                <TableHead>Теги</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.clubName}-${row.stadiumName}`}>
                  <TableCell>{row.clubName}</TableCell>
                  <TableCell>{row.stadiumName}</TableCell>
                  <TableCell>{row.leagueName}</TableCell>
                  <TableCell>{row.issueCount}</TableCell>
                  <TableCell>{row.tags.map((tag) => tag.name).join(", ") || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
