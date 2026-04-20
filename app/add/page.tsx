import { AddInformationTabs } from "@/components/add-information-tabs";
import { SectionHeader } from "@/components/section-header";
import { SyncControls } from "@/components/sync-controls";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import { getAddInfoPageData } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function AddPage({
  searchParams
}: {
  searchParams?: { club?: string };
}) {
  const data = await getAddInfoPageData();
  const clubs = data.clubs as Array<{
    id: string;
    name: string;
    league: { name: string };
    stadium: { name: string } | null;
  }>;
  const tags = data.tags as Array<{
    id: string;
    labelRu: string;
  }>;

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Добавление"
        title="Добавление новой информации"
      />

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <AddInformationTabs
          clubs={clubs.map((club) => ({
            id: club.id,
            name: club.name,
            league: club.league.name,
            stadium: club.stadium?.name ?? null
          }))}
          tags={tags.map((tag) => ({
            id: tag.id,
            labelRu: tag.labelRu
          }))}
          preselectedClubId={searchParams?.club}
        />

        <Card>
          <CardHeader>
            <CardTitle>Как работают привязки</CardTitle>
            <CardDescription>Система автоматически достраивает контекст по выбранному клубу.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <SyncControls
              seasonSlug={data.season?.slug}
              lastMatchesSyncAt={data.syncMeta.lastMatchesSyncAt ? formatDateTime(data.syncMeta.lastMatchesSyncAt) : null}
              lastBroadcastsSyncAt={data.syncMeta.lastBroadcastsSyncAt ? formatDateTime(data.syncMeta.lastBroadcastsSyncAt) : null}
            />
            <p>Лига, группа, сезон и ближайший домашний матч определяются автоматически по выбранному клубу.</p>
            <p>Стадион для файла подтягивается из связи клуб ↔ стадион 1 к 1, без ручного выбора объекта.</p>
            <p>После загрузки файл автоматически классифицируется как камерплан, фото, согласование или прочий материал.</p>
            <p>Если тип определён неверно, его можно исправить вручную прямо на странице клуба.</p>
            <p>После загрузки файла создаётся черновой стадионный remark, который затем можно подтвердить вручную.</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
