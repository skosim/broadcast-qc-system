import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { FilterLinkGroup } from "@/components/filter-link-group";
import { IssueCard } from "@/components/issue-card";
import { IssueTimeline } from "@/components/issue-timeline";
import { ResolveIssueButton } from "@/components/resolve-issue-button";
import { SeasonSwitcher } from "@/components/season-switcher";
import { SectionHeader } from "@/components/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDateTime } from "@/lib/utils";
import { getClubPageData } from "@/lib/repository";

export const dynamic = "force-dynamic";

const issueFilterItems = [
  { key: "all", label: "Все проблемы" },
  { key: "recent", label: "Последние 3 матча" },
  { key: "unresolved", label: "Только нерешенные" }
];

const modeItems = [
  { key: "cards", label: "Карточки" },
  { key: "timeline", label: "Таймлайн" }
];

export default async function ClubPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams?: {
    season?: string;
    issueFilter?: string;
    tag?: string;
    mode?: string;
  };
}) {
  const issueFilter = searchParams?.issueFilter ?? "all";
  const mode = searchParams?.mode ?? "cards";
  const data = await getClubPageData(params.slug, {
    seasonSlug: searchParams?.season,
    issueFilter,
    tagCode: searchParams?.tag,
    mode
  });

  if (!data.club) {
    notFound();
  }

  const club = data.club as {
    id: string;
    slug: string;
    name: string;
    city: string | null;
    league: { name: string };
    leagueGroup: { name: string } | null;
    stadium: {
      name: string;
      city: string | null;
      address: string | null;
      capacity: number | null;
      surfaceType: string | null;
      category: string | null;
      certificateNumber: string | null;
      certificateValidTo: Date | null;
      files: Array<{
        id: string;
        kind: string;
        originalName: string;
        filePath: string;
        mimeType: string;
        sourceUrl: string | null;
        comment: string | null;
        previewUrl: string | null;
        fileUrl: string;
        isImage: boolean;
      }>;
      remarks: Array<{
        id: string;
        rawText: string;
        normalizedText: string;
        status: string;
        tag: { labelRu: string } | null;
        sourceFile: { originalName: string } | null;
      }>;
    } | null;
    stats: {
      totalIssues: number;
      recentIssues: number;
      mostFrequentTag: string;
      latestIssue: { normalizedSummary: string | null } | null;
      hasCameraPlan: boolean;
      hasGallery: boolean;
    };
    tags: Array<{ id: string; code: string; labelRu: string }>;
    issues: Array<{
      id: string;
      status: string;
      roundLabel: string | null;
      rawDescription: string | null;
      normalizedSummary: string | null;
      createdBy: string | null;
      sourceReference: string | null;
      resolutionComment: string | null;
      createdAt: Date;
      match:
        | {
            id: string;
            kickoffAt: Date;
            homeClub: { name: string };
            awayClub: { name: string };
          }
        | null;
      issueTags: Array<{ tag: { labelRu: string } }>;
      history: Array<{ id: string; actorName: string; actionType: string; createdAt: Date; comment: string | null }>;
    }>;
    contacts: { name: string; phone: string } | null;
    clubImages: { stadium_images: string[]; camera_images: string[] } | null;
    stadiumRegistry: {
      stadium_name: string;
      stadium_emails: string[];
      address: string | null;
      category: string | null;
      capacity: string | null;
      allowed_capacity: string | null;
      turf_type: string | null;
      cert_number: string | null;
      cert_valid_to: string | null;
      note?: string | null;
      reserve_stadium?: {
        stadium_name: string;
        stadium_emails: string[];
        address: string | null;
        category: string | null;
        capacity: string | null;
        allowed_capacity: string | null;
        turf_type: string | null;
        cert_number: string | null;
        cert_valid_to: string | null;
        note?: string | null;
      } | null;
    } | null;
    recurringProblems: Array<{ key: string; count: number; summary: string }>;
    nextMatch: {
      id: string;
      homeClubId: string;
      awayClubId: string;
      roundLabel: string | null;
      kickoffAt: Date;
      status: string;
      fnlMatchUrl: string | null;
      broadcastUrl: string | null;
      delegateName: string | null;
      videoDelegateName: string | null;
      inspectorName: string | null;
      refereeName: string | null;
      homeClub: { name: string };
      awayClub: { name: string };
    } | null;
    lastMatch: {
      id: string;
      homeClubId: string;
      awayClubId: string;
      roundLabel: string | null;
      kickoffAt: Date;
      status: string;
      fnlMatchUrl: string | null;
      broadcastUrl: string | null;
      delegateName: string | null;
      videoDelegateName: string | null;
      inspectorName: string | null;
      refereeName: string | null;
      homeClub: { name: string };
      awayClub: { name: string };
    } | null;
    lastThreeMatches: Array<{
      id: string;
      homeClubId: string;
      awayClubId: string;
      roundLabel: string | null;
      kickoffAt: Date;
      status: string;
      fnlMatchUrl: string | null;
      broadcastUrl: string | null;
      delegateName: string | null;
      videoDelegateName: string | null;
      inspectorName: string | null;
      refereeName: string | null;
      homeClub: { name: string };
      awayClub: { name: string };
    }>;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <SectionHeader
          eyebrow="Страница клуба"
          title={club.name}
        />
        <div className="flex flex-wrap gap-3">
          <SeasonSwitcher
            seasons={data.seasons}
            activeSlug={data.season?.slug}
            basePath={`/clubs/${club.slug}`}
            extraParams={{ issueFilter, tag: searchParams?.tag, mode }}
          />
          <Button asChild>
            <Link href={`/add?club=${club.id}`}>Добавить проблему этому клубу</Link>
          </Button>
        </div>
      </div>

      {/* Stats row: 4 compact cards */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Проблем за сезон" value={String(club.stats.totalIssues)} compact />
        <SummaryCard label="За последние 3 матча" value={String(club.stats.recentIssues)} compact />
        <SummaryCard label="Самый частый тег" value={club.stats.mostFrequentTag} compact />
        <SummaryCard
          label="Последняя проблема"
          value={club.stats.latestIssue?.normalizedSummary ?? "Пока не зафиксирована"}
          compact
          subtle
        />
      </section>

      {/* League / Group row */}
      <section className="grid gap-3 sm:grid-cols-2">
        <SummaryCard label="Лига" value={club.league.name} compact subtle />
        <SummaryCard label="Группа" value={club.leagueGroup?.name ?? "—"} compact subtle />
      </section>

      {/* Images + Stadium passport side-by-side */}
      {(club.clubImages && (club.clubImages.stadium_images.length > 0 || club.clubImages.camera_images.length > 0)) || club.stadiumRegistry ? (
        <section className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
          {/* Left: photos */}
          {club.clubImages && (club.clubImages.stadium_images.length > 0 || club.clubImages.camera_images.length > 0) ? (
            <div className="space-y-5">
              {club.clubImages.stadium_images.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Фото стадиона</h2>
                  <div className="flex flex-col gap-3">
                    {club.clubImages.stadium_images.map((src, idx) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={idx}
                        src={src}
                        alt={`Фото стадиона ${idx + 1}`}
                        className="w-full rounded-lg object-contain border border-border/50 bg-secondary/20"
                        style={{ maxHeight: "340px" }}
                      />
                    ))}
                  </div>
                </div>
              )}
              {club.clubImages.camera_images.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Камерплан</h2>
                  <div className="flex flex-col gap-3">
                    {club.clubImages.camera_images.map((src, idx) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={idx}
                        src={src}
                        alt={`Камерплан ${idx + 1}`}
                        className="w-full rounded-lg object-contain border border-border/50 bg-secondary/20"
                        style={{ maxHeight: "340px" }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 p-5 text-sm text-muted-foreground">
              Фотоматериалы пока не загружены.
            </div>
          )}

          {/* Right: stadium passport */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Паспорт стадиона</CardTitle>
                <CardDescription>Данные из реестра стадионов ФНЛ.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {club.stadiumRegistry ? (
                  <>
                    <Info label="Стадион" value={club.stadiumRegistry.stadium_name} className="md:col-span-2" />
                    <Info label="Адрес" value={club.stadiumRegistry.address ?? "Не указан"} className="md:col-span-2" />
                    {club.stadiumRegistry.note && (
                      <div className="md:col-span-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">{club.stadiumRegistry.note}</div>
                    )}
                    <Info label="Категория / Разряд" value={club.stadiumRegistry.category ?? "Не указана"} />
                    <Info label="Тип газона" value={club.stadiumRegistry.turf_type ?? "Не указан"} />
                    <Info label="Вместимость" value={club.stadiumRegistry.capacity ?? "Не указана"} />
                    <Info label="Доп. вместимость" value={club.stadiumRegistry.allowed_capacity ?? "Не указана"} />
                    <Info label="Номер сертификата" value={club.stadiumRegistry.cert_number ?? "Не указан"} />
                    <Info label="Срок сертификата" value={club.stadiumRegistry.cert_valid_to ?? "Не указан"} />
                  </>
                ) : (
                  <div className="md:col-span-2 rounded-2xl border border-dashed border-border/70 bg-secondary/20 p-5 text-sm text-muted-foreground">
                    Данные по стадиону в реестре ФНЛ не найдены.
                  </div>
                )}
              </CardContent>
            </Card>

            {club.stadiumRegistry?.reserve_stadium && (
              <Card className="border-dashed border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Резервный стадион</CardTitle>
                  <CardDescription>Запасная площадка из реестра стадионов ФНЛ.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <Info label="Стадион" value={club.stadiumRegistry.reserve_stadium.stadium_name} className="md:col-span-2" />
                  <Info label="Адрес" value={club.stadiumRegistry.reserve_stadium.address ?? "Не указан"} className="md:col-span-2" />
                  {club.stadiumRegistry.reserve_stadium.note && (
                    <div className="md:col-span-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">{club.stadiumRegistry.reserve_stadium.note}</div>
                  )}
                  <Info label="Категория / Разряд" value={club.stadiumRegistry.reserve_stadium.category ?? "Не указана"} />
                  <Info label="Тип газона" value={club.stadiumRegistry.reserve_stadium.turf_type ?? "Не указан"} />
                  <Info label="Вместимость" value={club.stadiumRegistry.reserve_stadium.capacity ?? "Не указана"} />
                  <Info label="Доп. вместимость" value={club.stadiumRegistry.reserve_stadium.allowed_capacity ?? "Не указана"} />
                  <Info label="Номер сертификата" value={club.stadiumRegistry.reserve_stadium.cert_number ?? "Не указан"} />
                  <Info label="Срок сертификата" value={club.stadiumRegistry.reserve_stadium.cert_valid_to ?? "Не указан"} />
                  {club.stadiumRegistry.reserve_stadium.stadium_emails.length > 0 && (
                    <div className="md:col-span-2">
                      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">Email стадиона</div>
                      <div className="flex flex-wrap gap-3">
                        {club.stadiumRegistry.reserve_stadium.stadium_emails.map((email) => (
                          <a key={email} href={`mailto:${email}`} className="text-sm font-medium text-primary hover:underline">{email}</a>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      ) : null}

      {(club.contacts || club.stadiumRegistry) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Контакты</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {club.contacts && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Пресс-атташе</p>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
                  <div>
                    <p className="text-xs text-muted-foreground">Имя</p>
                    <p className="text-base font-semibold">{club.contacts.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Телефон / Контакт</p>
                    <p className="text-base font-semibold">{club.contacts.phone}</p>
                  </div>
                </div>
              </div>
            )}
            {club.stadiumRegistry && club.stadiumRegistry.stadium_emails.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Стадион — {club.stadiumRegistry.stadium_name}</p>
                <div className="flex flex-wrap gap-4">
                  {club.stadiumRegistry.stadium_emails.map((email) => (
                    <a key={email} href={`mailto:${email}`} className="text-base font-semibold text-primary hover:underline">{email}</a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <CardTitle>Проблемы трансляций</CardTitle>
                <CardDescription>Одна проблема = один конкретный инцидент, связанный с клубом, матчем и сезоном.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {modeItems.map((item) => {
                  const params = new URLSearchParams();
                  if (data.season?.slug) {
                    params.set("season", data.season.slug);
                  }
                  params.set("issueFilter", issueFilter);
                  params.set("mode", item.key);
                  if (searchParams?.tag) {
                    params.set("tag", searchParams.tag);
                  }

                  return (
                    <Link
                      key={item.key}
                      href={`/clubs/${club.slug}?${params.toString()}`}
                      className={cn(
                        "rounded-full border px-3 py-2 text-sm transition",
                        mode === item.key
                          ? "border-primary/50 bg-primary/15 text-primary"
                          : "border-border/80 bg-secondary/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <FilterLinkGroup
              items={issueFilterItems}
              activeKey={issueFilter}
              basePath={`/clubs/${club.slug}`}
              paramName="issueFilter"
              extraParams={{ season: data.season?.slug, tag: searchParams?.tag, mode }}
            />

            <div className="flex flex-wrap gap-2">
              <TagFilterPill
                clubSlug={club.slug}
                label="Все теги"
                isActive={!searchParams?.tag}
                seasonSlug={data.season?.slug}
                issueFilter={issueFilter}
                mode={mode}
              />
              {club.tags.map((tag) => (
                <TagFilterPill
                  key={tag.id}
                  clubSlug={club.slug}
                  label={tag.labelRu}
                  tagCode={tag.code}
                  isActive={searchParams?.tag === tag.code}
                  seasonSlug={data.season?.slug}
                  issueFilter={issueFilter}
                  mode={mode}
                />
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {club.issues.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 p-5 text-sm text-muted-foreground">
                По выбранным фильтрам проблемы не найдены.
              </div>
            ) : null}

            {mode === "timeline" ? (
              <IssueTimeline issues={club.issues} />
            ) : (
              club.issues.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  actions={
                    issue.status === "new" || issue.status === "in_review" ? <ResolveIssueButton issueId={issue.id} /> : undefined
                  }
                />
              ))
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Следующий матч</CardTitle>
            </CardHeader>
            <CardContent>
              <MatchSummaryBlock match={club.nextMatch} clubId={club.id} emptyText="Следующий матч пока не определен." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Последний матч</CardTitle>
            </CardHeader>
            <CardContent>
              <MatchSummaryBlock match={club.lastMatch} clubId={club.id} emptyText="Последний сыгранный матч пока не найден." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Повторяющиеся проблемы сезона</CardTitle>
              <CardDescription>Сигналы по хроническим сбоям, которые стоит контролировать отдельно.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {club.recurringProblems.length === 0 ? (
                <div className="text-sm text-muted-foreground">Повторяющиеся проблемы пока не выявлены.</div>
              ) : null}
              {club.recurringProblems.map((item) => (
                <div key={item.key} className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
                  <div className="font-medium text-foreground">{item.summary}</div>
                  <div className="mt-1 text-sm text-muted-foreground">Повторений за сезон: {item.count}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Последние 3 матча</CardTitle>
              <CardDescription>Матчи клуба с прямыми ссылками и ключевыми назначениями.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {club.lastThreeMatches.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 p-5 text-sm text-muted-foreground">
                  Матчи клуба по выбранному сезону пока не загружены.
                </div>
              ) : null}
              {club.lastThreeMatches.map((match) => {
                const isHome = match.homeClubId === club.id;
                const opponent = isHome ? match.awayClub.name : match.homeClub.name;

                return (
                  <div key={match.id} className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-foreground">{formatDateTime(match.kickoffAt)}</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {isHome ? "Дома" : "В гостях"} · соперник: {opponent}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{match.roundLabel ?? "Тур не указан"}</Badge>
                        <Badge variant="secondary">{match.status === "upcoming" ? "Скоро" : match.status === "live" ? "Идет" : "Завершен"}</Badge>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                      <div>Делегат: {match.delegateName ?? "Не указан"}</div>
                      <div>Видеоделегат: {match.videoDelegateName ?? "Не указан"}</div>
                      <div>Инспектор: {match.inspectorName ?? "Не указан"}</div>
                      <div>Судья: {match.refereeName ?? "Не указан"}</div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-3 text-sm">
                      {match.fnlMatchUrl ? (
                        <a href={match.fnlMatchUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
                          Карточка матча <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : null}
                      {match.broadcastUrl ? (
                        <a href={match.broadcastUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
                          Прямая трансляция <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">Прямая ссылка пока не задана</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Стадионные замечания</CardTitle>
          <CardDescription>Нижний слой страницы клуба с замечаниями по стадиону и статусами обработки.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {club.stadium?.remarks.length ? null : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 p-5 text-sm text-muted-foreground">
              Стадионные замечания пока не подтверждены.
            </div>
          )}

          {club.stadium?.remarks.map((remark) => (
            <div key={remark.id} className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {remark.tag ? <Badge variant="secondary">{remark.tag.labelRu}</Badge> : <Badge variant="outline">Без тега</Badge>}
                  <Badge variant="outline">{remark.status}</Badge>
                </div>
                {remark.sourceFile ? <span className="text-sm text-muted-foreground">{remark.sourceFile.originalName}</span> : null}
              </div>
              <div className="mt-3 text-sm text-foreground">{remark.normalizedText}</div>
              <div className="mt-2 text-sm text-muted-foreground">{remark.rawText}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function MatchSummaryBlock({
  match,
  clubId,
  emptyText
}: {
  match:
    | {
        homeClubId: string;
        awayClubId: string;
        roundLabel: string | null;
        kickoffAt: Date;
        status: string;
        fnlMatchUrl: string | null;
        broadcastUrl: string | null;
        delegateName: string | null;
        videoDelegateName: string | null;
        inspectorName: string | null;
        refereeName: string | null;
        homeClub: { name: string };
        awayClub: { name: string };
      }
    | null;
  clubId: string;
  emptyText: string;
}) {
  if (!match) {
    return <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 p-5 text-sm text-muted-foreground">{emptyText}</div>;
  }

  const isHome = match.homeClubId === clubId;
  const opponent = isHome ? match.awayClub.name : match.homeClub.name;

  return (
    <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-medium text-foreground">{formatDateTime(match.kickoffAt)}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {isHome ? "Дома" : "В гостях"} · соперник: {opponent}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{match.roundLabel ?? "Тур не указан"}</Badge>
          <Badge variant="secondary">{match.status === "upcoming" ? "Скоро" : match.status === "live" ? "Идет" : "Завершен"}</Badge>
        </div>
      </div>

      <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
        <div>Делегат: {match.delegateName ?? "Не указан"}</div>
        <div>Видеоделегат: {match.videoDelegateName ?? "Не указан"}</div>
        <div>Инспектор: {match.inspectorName ?? "Не указан"}</div>
        <div>Судья: {match.refereeName ?? "Не указан"}</div>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        {match.fnlMatchUrl ? (
          <a href={match.fnlMatchUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
            Карточка матча <ExternalLink className="h-4 w-4" />
          </a>
        ) : null}
        {match.broadcastUrl ? (
          <a href={match.broadcastUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
            Прямая трансляция <ExternalLink className="h-4 w-4" />
          </a>
        ) : (
          <span className="text-muted-foreground">Прямая ссылка пока не задана</span>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, subtle, compact }: { label: string; value: string; subtle?: boolean; compact?: boolean }) {
  return (
    <Card className={cn(subtle ? "bg-secondary/30" : "bg-card")}>
      <CardContent className={cn("space-y-1", compact ? "pt-4 pb-4" : "space-y-2 pt-6")}>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
        <div className={cn("font-semibold text-foreground", compact ? "text-base" : "text-lg")}>{value}</div>
      </CardContent>
    </Card>
  );
}

function Info({
  label,
  value,
  className
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-sm text-foreground">{value}</div>
    </div>
  );
}

function TagFilterPill({
  clubSlug,
  label,
  tagCode,
  seasonSlug,
  issueFilter,
  mode,
  isActive
}: {
  clubSlug: string;
  label: string;
  tagCode?: string;
  seasonSlug?: string;
  issueFilter: string;
  mode: string;
  isActive: boolean;
}) {
  const params = new URLSearchParams();
  if (seasonSlug) {
    params.set("season", seasonSlug);
  }
  params.set("issueFilter", issueFilter);
  params.set("mode", mode);
  if (tagCode) {
    params.set("tag", tagCode);
  }

  return (
    <Link
      href={`/clubs/${clubSlug}?${params.toString()}`}
      className={cn(
        "rounded-full border px-3 py-2 text-sm transition",
        isActive
          ? "border-primary/50 bg-primary/15 text-primary"
          : "border-border/80 bg-secondary/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {label}
    </Link>
  );
}
