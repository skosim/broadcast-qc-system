import { ClubSearchForm } from "@/components/club-search-form";
import { ClubsDataTable } from "@/components/clubs-data-table";
import { SeasonSwitcher } from "@/components/season-switcher";
import { SectionHeader } from "@/components/section-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getClubsDirectory } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function ClubsPage({
  searchParams
}: {
  searchParams?: { season?: string; search?: string };
}) {
  const data = await getClubsDirectory({
    seasonSlug: searchParams?.season,
    search: searchParams?.search
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <SectionHeader eyebrow="Клубы" title="Каталог клубов ФНЛ" />
        <SeasonSwitcher seasons={data.seasons} activeSlug={data.season?.slug} basePath="/clubs" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Общий список клубов</CardTitle>
          <CardDescription>Список клубов с основными метриками по качеству трансляций.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ClubSearchForm
            basePath="/clubs"
            searchValue={searchParams?.search}
            hiddenParams={{ season: data.season?.slug }}
            placeholder="Найти клуб в каталоге"
          />
          <ClubsDataTable rows={data.rows} seasonSlug={data.season?.slug} />
        </CardContent>
      </Card>
    </div>
  );
}
