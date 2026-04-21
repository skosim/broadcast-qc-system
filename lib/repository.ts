import type {
  BroadcastIssue,
  BroadcastIssueHistory,
  Club,
  DataSyncJob,
  League,
  LeagueGroup,
  Match,
  Season,
  Stadium,
  StadiumFile,
  StadiumFileKind,
  StadiumRemark,
  Tag
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { classifyStadiumFile, isImageFile } from "@/lib/services/stadium-file-classifier";
import { getMoscowDateRange } from "@/lib/utils";

type IssueWithRelations = BroadcastIssue & {
  match: (Match & {
    homeClub: Pick<Club, "id" | "name" | "slug">;
    awayClub: Pick<Club, "id" | "name" | "slug">;
  }) | null;
  issueTags: Array<{
    tag: Tag;
    isPrimary: boolean;
  }>;
  history: BroadcastIssueHistory[];
};

type MatchWithRelations = Match & {
  league: League;
  leagueGroup: LeagueGroup | null;
  homeClub: Club;
  awayClub: Club;
  stadium: Stadium | null;
};

type ClubWithRelations = Club & {
  league: League;
  leagueGroup: LeagueGroup | null;
  stadium: Stadium | null;
  broadcastIssues: IssueWithRelations[];
  stadiumFiles: StadiumFile[];
};

export async function getSeasonOptions() {
  return prisma.season.findMany({
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      isCurrent: true
    }
  });
}

export async function getActiveSeason(seasonSlug?: string) {
  if (seasonSlug) {
    const season = await prisma.season.findUnique({
      where: { slug: seasonSlug }
    });

    if (season) {
      return season;
    }
  }

  return prisma.season.findFirst({
    where: { isCurrent: true },
    orderBy: { startedAt: "desc" }
  });
}

export async function getLeagueOptions() {
  return prisma.league.findMany({
    orderBy: { orderIndex: "asc" },
    select: {
      code: true,
      name: true
    }
  });
}

export async function getOverviewData(options?: {
  seasonSlug?: string;
  clubFilter?: string;
  search?: string;
}) {
  const season = await getActiveSeason(options?.seasonSlug);

  if (!season) {
    return {
      season: null,
      seasons: [],
      kpis: {
        matchesToday: 0,
        avgProblemsPerBroadcast: 0,
        resolvedPercent: 0
      },
      todayMatches: [],
      opsSummary: {
        updatedToday: 0,
        newProblemsToday: 0,
        matchesPulledToday: 0,
        awaitingReview: 0
      },
      leagues: [],
      reviewQueue: [],
      syncMeta: {
        lastMatchesSyncAt: null,
        lastBroadcastsSyncAt: null
      }
    };
  }

  const seasons = await getSeasonOptions();
  const { start, end } = getMoscowDateRange();

  const [todayMatches, seasonMatches, clubs, issues, syncJobs] = await Promise.all([
    prisma.match.findMany({
      where: {
        seasonId: season.id,
        kickoffAt: {
          gte: start,
          lte: end
        }
      },
      orderBy: { kickoffAt: "asc" },
      include: {
        league: true,
        homeClub: true,
        awayClub: true
      }
    }),
    prisma.match.findMany({
      where: { seasonId: season.id },
      orderBy: { kickoffAt: "desc" },
      include: {
        league: true,
        leagueGroup: true,
        homeClub: true,
        awayClub: true
      }
    }),
    prisma.club.findMany({
      orderBy: { name: "asc" },
      include: {
        league: true,
        leagueGroup: true,
        stadium: true,
        stadiumFiles: true,
        broadcastIssues: {
          where: { seasonId: season.id },
          include: {
            match: {
              include: {
                homeClub: { select: { id: true, name: true, slug: true } },
                awayClub: { select: { id: true, name: true, slug: true } }
              }
            },
            issueTags: {
              include: {
                tag: true
              }
            },
            history: {
              orderBy: { createdAt: "desc" }
            }
          }
        }
      }
    }),
    prisma.broadcastIssue.findMany({
      where: { seasonId: season.id },
      include: {
        issueTags: {
          include: { tag: true }
        }
      }
    }),
    prisma.dataSyncJob.findMany({
      where: { seasonId: season.id },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const recentMatchIdsByClub = new Map<string, string[]>();
  const matchesByClub = new Map<string, Match[]>();
  const nextMatchByClub = new Map<string, MatchWithRelations>();
  const lastMatchByClub = new Map<string, MatchWithRelations>();

  for (const match of seasonMatches as MatchWithRelations[]) {
    const homeMatches = matchesByClub.get(match.homeClubId) ?? [];
    homeMatches.push(match);
    matchesByClub.set(match.homeClubId, homeMatches);

    const awayMatches = matchesByClub.get(match.awayClubId) ?? [];
    awayMatches.push(match);
    matchesByClub.set(match.awayClubId, awayMatches);
  }

  for (const [clubId, matches] of matchesByClub.entries()) {
    const sortedDesc = matches
      .sort((left, right) => right.kickoffAt.getTime() - left.kickoffAt.getTime())
    const ids = sortedDesc
      .slice(0, 3)
      .map((match) => match.id);
    recentMatchIdsByClub.set(clubId, ids);

    const future = [...matches].filter((match) => match.kickoffAt.getTime() >= Date.now()).sort((left, right) => left.kickoffAt.getTime() - right.kickoffAt.getTime())[0];
    const past = [...sortedDesc].find((match) => match.kickoffAt.getTime() < Date.now());
    if (future) {
      nextMatchByClub.set(clubId, future as MatchWithRelations);
    }
    if (past) {
      lastMatchByClub.set(clubId, past as MatchWithRelations);
    }
  }

  const leagueGroups = clubs.reduce<Record<string, Array<ClubWithRelations & { derived: ClubOverviewRow }>>>((acc, club) => {
    const unresolvedIssues = club.broadcastIssues.filter((issue) => issue.status === "new" || issue.status === "in_review");
    const recentIssueCount = club.broadcastIssues.filter((issue) =>
      issue.matchId ? (recentMatchIdsByClub.get(club.id) ?? []).includes(issue.matchId) : false
    ).length;
    const recurringIssues = club.broadcastIssues.filter((issue) => issue.isRecurring).length;
    const hasCameraPlan = club.stadiumFiles.some((file) => file.kind === "camera_plan");
    const lastUpdated = [...club.broadcastIssues.map((issue) => issue.updatedAt), club.updatedAt]
      .sort((left, right) => right.getTime() - left.getTime())[0];
    const tags = Array.from(
      new Map(
        club.broadcastIssues
          .flatMap((issue) => issue.issueTags.map((item) => [item.tag.code, item.tag.labelRu]))
          .map(([code, labelRu]) => [code, { code, labelRu }])
      ).values()
    ).slice(0, 4);

    const row: ClubOverviewRow = {
      id: club.id,
      slug: club.slug,
      clubName: club.name,
      stadiumName: club.stadium?.name ?? "Не указан",
      city: club.city ?? club.stadium?.city ?? "Не указан",
      lastUpdated,
      unresolvedIssueCount: unresolvedIssues.length,
      recentIssueCount,
      recurringIssueCount: recurringIssues,
      problemTags: tags,
      hasCameraPlan,
      leagueName: club.league.name,
      groupName: club.leagueGroup?.name ?? null,
      nextMatch: mapClubMatch(nextMatchByClub.get(club.id), club.id),
      lastMatch: mapClubMatch(lastMatchByClub.get(club.id), club.id)
    };

    if (matchesFilterPass(row, options?.clubFilter ?? "all") && matchesSearchPass(club, options?.search)) {
      const key = club.league.code;
      acc[key] ??= [];
      acc[key].push({ ...(club as ClubWithRelations), derived: row });
    }

    return acc;
  }, {});

  const resolvedCount = issues.filter((issue) => issue.status === "resolved" || issue.status === "archived").length;
  const latestMatchesSync = syncJobs.find((job) => job.jobType === "matches" && job.status === "completed");
  const latestBroadcastsSync = syncJobs.find((job) => job.jobType === "broadcasts" && job.status === "completed");
  const reviewQueue = (seasonMatches as MatchWithRelations[])
    .filter((match) => match.broadcastMatchMode === "requires_review")
    .sort((left, right) => left.kickoffAt.getTime() - right.kickoffAt.getTime())
    .slice(0, 6)
    .map((match) => ({
      id: match.id,
      kickoffAt: match.kickoffAt,
      status: match.status,
      fnlMatchUrl: match.fnlMatchUrl,
      broadcastUrl: match.broadcastUrl,
      broadcastReviewReason: match.broadcastReviewReason,
      homeClub: { name: match.homeClub.name },
      awayClub: { name: match.awayClub.name }
    }));

  return {
    season,
    seasons,
    kpis: {
      matchesToday: todayMatches.length,
      avgProblemsPerBroadcast: seasonMatches.length ? issues.length / seasonMatches.length : 0,
      resolvedPercent: issues.length ? (resolvedCount / issues.length) * 100 : 0
    },
    todayMatches: todayMatches.map((match) => ({
      id: match.id,
      league: match.league.name,
      kickoffAt: match.kickoffAt,
      status: match.status,
      homeTeam: match.homeClub.name,
      awayTeam: match.awayClub.name,
      matchUrl: match.fnlMatchUrl ?? null,
      streamUrl: match.broadcastUrl ?? null
    })),
    opsSummary: {
      updatedToday: issues.filter((issue) => issue.updatedAt >= start && issue.updatedAt <= end).length,
      newProblemsToday: issues.filter((issue) => issue.createdAt >= start && issue.createdAt <= end).length,
      matchesPulledToday:
        syncJobs
          .filter((job) => job.jobType === "matches" && job.createdAt >= start && job.createdAt <= end)
          .length || todayMatches.length,
      awaitingReview: (seasonMatches as MatchWithRelations[]).filter((match) => match.broadcastMatchMode === "requires_review").length
    },
    reviewQueue,
    syncMeta: {
      lastMatchesSyncAt: latestMatchesSync?.finishedAt ?? latestMatchesSync?.updatedAt ?? null,
      lastBroadcastsSyncAt: latestBroadcastsSync?.finishedAt ?? latestBroadcastsSync?.updatedAt ?? null
    },
    leagues: Object.values(leagueGroups)
      .map((clubItems) => {
        const grouped = clubItems.reduce<
          Record<
            string,
            {
              groupCode: string;
              groupName: string;
              orderIndex: number;
              clubs: ClubOverviewRow[];
            }
          >
        >((acc, item) => {
          const groupCode = item.leagueGroup?.code ?? "all";
          const groupName = item.leagueGroup?.name ?? "Общая таблица";

          acc[groupCode] ??= {
            groupCode,
            groupName,
            orderIndex: item.leagueGroup?.orderIndex ?? 0,
            clubs: []
          };

          acc[groupCode].clubs.push(item.derived);
          return acc;
        }, {});

        return {
          leagueCode: clubItems[0]?.league.code ?? "",
          leagueName: clubItems[0]?.league.name ?? "",
          totalClubCount: clubItems.length,
          groups: Object.values(grouped)
            .sort((left, right) => left.orderIndex - right.orderIndex || left.groupName.localeCompare(right.groupName, "ru"))
            .map((group) => ({
              groupCode: group.groupCode,
              groupName: group.groupName,
              clubs: group.clubs.sort(
                (left, right) =>
                  right.unresolvedIssueCount - left.unresolvedIssueCount || left.clubName.localeCompare(right.clubName, "ru")
              )
            }))
        };
      })
      .sort((left, right) => {
        const a = clubs.find((club) => club.league.code === left.leagueCode)?.league.orderIndex ?? 0;
        const b = clubs.find((club) => club.league.code === right.leagueCode)?.league.orderIndex ?? 0;
        return a - b;
      })
  };
}

type ClubOverviewRow = {
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
  leagueName: string;
  groupName: string | null;
  nextMatch: ClubMatchSummary | null;
  lastMatch: ClubMatchSummary | null;
};

type ClubMatchSummary = {
  id: string;
  opponent: string;
  isHome: boolean;
  kickoffAt: Date;
  status: string;
  matchUrl: string | null;
  streamUrl: string | null;
};

function mapClubMatch(match: MatchWithRelations | undefined, clubId: string): ClubMatchSummary | null {
  if (!match) {
    return null;
  }

  const isHome = match.homeClubId === clubId;
  return {
    id: match.id,
    opponent: isHome ? match.awayClub.name : match.homeClub.name,
    isHome,
    kickoffAt: match.kickoffAt,
    status: match.status,
    matchUrl: match.fnlMatchUrl ?? null,
    streamUrl: match.broadcastUrl ?? null
  };
}

function matchesFilterPass(row: ClubOverviewRow, filter: string) {
  if (filter === "unresolved") {
    return row.unresolvedIssueCount > 0;
  }

  if (filter === "recent") {
    return row.recentIssueCount > 0;
  }

  if (filter === "repeating") {
    return row.recurringIssueCount > 0;
  }

  if (filter === "camera_plan") {
    return row.hasCameraPlan;
  }

  if (filter === "without_camera_plan") {
    return !row.hasCameraPlan;
  }

  return true;
}

export async function getClubsDirectory(options?: {
  seasonSlug?: string;
  search?: string;
}) {
  const season = await getActiveSeason(options?.seasonSlug);
  const seasons = await getSeasonOptions();

  if (!season) {
    return { season: null, seasons, rows: [] };
  }

  const clubs = await prisma.club.findMany({
    orderBy: { name: "asc" },
    include: {
      league: true,
      leagueGroup: true,
      stadium: true,
      stadiumFiles: true,
      broadcastIssues: {
        where: { seasonId: season.id },
        include: {
          issueTags: {
            include: {
              tag: true
            }
          }
        }
      }
    }
  });

  const filteredClubs = clubs.filter((club) => matchesSearchPass(club, options?.search));

  return {
    season,
    seasons,
    rows: filteredClubs
      .sort((left, right) => left.league.orderIndex - right.league.orderIndex || left.name.localeCompare(right.name, "ru"))
      .map((club) => {
      const primaryTags = Array.from(
        new Map(
          club.broadcastIssues
            .flatMap((issue) => issue.issueTags.filter((item) => item.isPrimary).map((item) => [item.tag.code, item.tag.labelRu]))
            .map(([code, label]) => [code, { code, label }])
        ).values()
      );

        return {
          id: club.id,
          slug: club.slug,
          name: club.name,
          city: club.city ?? "Не указан",
          league: club.league.name,
          group: club.leagueGroup?.name ?? "—",
          stadium: club.stadium?.name ?? "Не указан",
          totalIssues: club.broadcastIssues.length,
          unresolvedIssues: club.broadcastIssues.filter((issue) => issue.status === "new" || issue.status === "in_review").length,
          recurringIssues: club.broadcastIssues.filter((issue) => issue.isRecurring).length,
          hasCameraPlan: club.stadiumFiles.some((file) => file.kind === "camera_plan"),
          lastUpdated: [...club.broadcastIssues.map((issue) => issue.updatedAt), club.updatedAt]
            .sort((left, right) => right.getTime() - left.getTime())[0],
          tags: primaryTags
        };
      })
  };
}

function matchesSearchPass(
  club: Pick<Club, "name" | "shortName" | "aliasesJson" | "city">,
  search?: string
) {
  const needle = normalizeSearchValue(search);

  if (!needle) {
    return true;
  }

  const aliases = safeParseAliases(club.aliasesJson);
  const haystack = [
    club.name,
    club.shortName,
    club.city,
    ...aliases
  ]
    .filter(Boolean)
    .map((value) => normalizeSearchValue(value))
    .join(" ");

  return haystack.includes(needle);
}

function normalizeSearchValue(value?: string | null) {
  return (value ?? "")
    .toLocaleLowerCase("ru")
    .replace(/ё/g, "е")
    .replace(/[()"'.,]/g, " ")
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeParseAliases(aliasesJson?: string | null) {
  if (!aliasesJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(aliasesJson);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

export async function getClubPageData(slug: string, options?: {
  seasonSlug?: string;
  issueFilter?: string;
  tagCode?: string;
  mode?: string;
}) {
  const season = await getActiveSeason(options?.seasonSlug);
  const seasons = await getSeasonOptions();

  const club = await prisma.club.findUnique({
    where: { slug },
    include: {
      league: true,
      leagueGroup: true,
      stadium: {
        include: {
          remarks: {
            include: {
              tag: true,
              sourceFile: true
            },
            orderBy: { updatedAt: "desc" }
          },
          files: {
            orderBy: { createdAt: "desc" }
          }
        }
      }
    }
  });

  if (!club || !season) {
    return {
      season,
      seasons,
      club: null
    };
  }

  const [issues, matches, tags] = await Promise.all([
    prisma.broadcastIssue.findMany({
      where: {
        clubId: club.id,
        seasonId: season.id
      },
      orderBy: { createdAt: "desc" },
      include: {
        match: {
          include: {
            homeClub: true,
            awayClub: true
          }
        },
        issueTags: {
          include: {
            tag: true
          }
        },
        history: {
          orderBy: { createdAt: "desc" }
        }
      }
    }),
    prisma.match.findMany({
      where: {
        seasonId: season.id,
        OR: [{ homeClubId: club.id }, { awayClubId: club.id }]
      },
      orderBy: { kickoffAt: "desc" },
      include: {
        homeClub: true,
        awayClub: true,
        league: true,
        leagueGroup: true
      }
    }),
    prisma.tag.findMany({
      orderBy: { labelRu: "asc" }
    })
  ]);

  const lastThreeMatches = [...matches].sort((left, right) => right.kickoffAt.getTime() - left.kickoffAt.getTime()).slice(0, 3);
  const lastThreeIds = new Set(lastThreeMatches.map((match) => match.id));
  const nextMatch = [...matches].filter((match) => match.kickoffAt.getTime() >= Date.now()).sort((left, right) => left.kickoffAt.getTime() - right.kickoffAt.getTime())[0] ?? null;
  const lastMatch = [...matches].filter((match) => match.kickoffAt.getTime() < Date.now()).sort((left, right) => right.kickoffAt.getTime() - left.kickoffAt.getTime())[0] ?? null;
  const filteredIssues = issues.filter((issue) => {
    if (options?.issueFilter === "recent" && (!issue.matchId || !lastThreeIds.has(issue.matchId))) {
      return false;
    }
    if (options?.issueFilter === "unresolved" && !["new", "in_review"].includes(issue.status)) {
      return false;
    }
    if (options?.tagCode && !issue.issueTags.some((item) => item.tag.code === options.tagCode)) {
      return false;
    }
    return true;
  });

  const groupedRecurring = Array.from(
    issues
      .filter((issue) => issue.recurringKey)
      .reduce<Map<string, IssueWithRelations[]>>((acc, issue) => {
        const key = issue.recurringKey!;
        const list = acc.get(key) ?? [];
        list.push(issue as IssueWithRelations);
        acc.set(key, list);
        return acc;
      }, new Map())
      .entries()
  )
    .filter(([, list]) => list.length > 1)
    .map(([key, list]) => ({
      key,
      count: list.length,
      summary: list[0]?.normalizedSummary ?? "Повторяющаяся проблема"
    }));

  const tagFrequency = issues.flatMap((issue) => issue.issueTags.map((item) => item.tag.labelRu));
  const mostFrequentTag = Array.from(
    tagFrequency.reduce<Map<string, number>>((acc, tag) => {
      acc.set(tag, (acc.get(tag) ?? 0) + 1);
      return acc;
    }, new Map()).entries()
  ).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "Не определен";

  const latestIssue = issues[0] ?? null;
  const hasCameraPlan = club.stadium?.files.some((file) => file.kind === "camera_plan") ?? false;
  const hasGallery = club.stadium?.files.some((file) => file.kind === "gallery") ?? false;

  // Load press-attache contacts
  let contacts = null;
  try {
    const contactsData = require("./press-attache-contacts.json");
    contacts = contactsData[club.name] || contactsData[club.shortName || ""] || null;
  } catch (e) {
    // Ignore if file doesn't exist yet
  }

  return {
    season,
    seasons,
    club: {
      ...club,
      contacts,
      stats: {
        totalIssues: issues.length,
        recentIssues: issues.filter((issue) => issue.matchId && lastThreeIds.has(issue.matchId)).length,
        mostFrequentTag,
        latestIssue,
        hasCameraPlan,
        hasGallery
      },
      stadium: club.stadium
        ? {
            ...club.stadium,
            files: club.stadium.files.map((file) => getStadiumFileViewModel(file))
          }
        : null,
      tags,
      issues: filteredIssues,
      allIssues: issues,
      recurringProblems: groupedRecurring,
      nextMatch,
      lastMatch,
      matches,
      lastThreeMatches
    }
  };
}

export async function getBroadcastStatistics(options?: {
  seasonSlug?: string;
  leagueCode?: string;
  tagCode?: string;
}) {
  const season = await getActiveSeason(options?.seasonSlug);
  const seasons = await getSeasonOptions();
  const leagues = await getLeagueOptions();

  if (!season) {
    return { season: null, seasons, leagues, tagStats: [], roundStats: [], clubStats: [], heatmap: [], recurring: [] };
  }

  const issuesRaw = await prisma.broadcastIssue.findMany({
    where: {
      seasonId: season.id
    },
    include: {
      club: {
        include: {
          league: true
        }
      },
      issueTags: {
        include: { tag: true }
      }
    }
  });

  const issues =
    options?.leagueCode && options.leagueCode !== "all"
      ? issuesRaw.filter((issue) => issue.club.league.code === options.leagueCode)
      : issuesRaw;
  const filteredIssues = options?.tagCode
    ? issues.filter((issue) => issue.issueTags.some((item) => item.tag.code === options.tagCode))
    : issues;

  const tagStats = Array.from(
    filteredIssues.reduce<Map<string, Set<string>>>((acc, issue) => {
      issue.issueTags.forEach((item) => {
        const clubs = acc.get(item.tag.labelRu) ?? new Set<string>();
        clubs.add(issue.club.name);
        acc.set(item.tag.labelRu, clubs);
      });
      return acc;
    }, new Map())
  )
    .map(([name, clubs]) => ({
      name,
      value: Array.from(
        filteredIssues.reduce<Set<string>>((acc, issue) => {
          if (issue.issueTags.some((item) => item.tag.labelRu === name)) {
            acc.add(issue.id);
          }
          return acc;
        }, new Set())
      ).length,
      clubs: Array.from(clubs).sort((left, right) => left.localeCompare(right, "ru"))
    }))
    .sort((left, right) => right.value - left.value || left.name.localeCompare(right.name, "ru"));

  const roundStats = Array.from(
    filteredIssues.reduce<Map<string, Set<string>>>((acc, issue) => {
      const round = issue.roundLabel ?? "Без тура";
      const clubs = acc.get(round) ?? new Set<string>();
      clubs.add(issue.club.name);
      acc.set(round, clubs);
      return acc;
    }, new Map())
  )
    .map(([name, clubs]) => ({
      name,
      value: filteredIssues.filter((issue) => (issue.roundLabel ?? "Без тура") === name).length,
      clubs: Array.from(clubs).sort((left, right) => left.localeCompare(right, "ru"))
    }))
    .sort((left, right) => right.value - left.value || left.name.localeCompare(right.name, "ru"));
  const clubStats = aggregateCounts(filteredIssues.map((issue) => issue.club.name));

  const heatmap = Array.from(
    filteredIssues.reduce<Map<string, Map<string, number>>>((acc, issue) => {
      const clubMap = acc.get(issue.club.name) ?? new Map<string, number>();
      issue.issueTags.forEach((item) => {
        clubMap.set(item.tag.labelRu, (clubMap.get(item.tag.labelRu) ?? 0) + 1);
      });
      acc.set(issue.club.name, clubMap);
      return acc;
    }, new Map())
  ).map(([club, tagsMap]) => ({
    club,
    tags: Array.from(tagsMap.entries()).map(([tag, value]) => ({ tag, value }))
  }));

  const tagRoundMatrix = Array.from(
    filteredIssues.reduce<Map<string, Map<string, number>>>((acc, issue) => {
      const round = issue.roundLabel ?? "Без тура";
      issue.issueTags.forEach((item) => {
        const roundMap = acc.get(item.tag.labelRu) ?? new Map<string, number>();
        roundMap.set(round, (roundMap.get(round) ?? 0) + 1);
        acc.set(item.tag.labelRu, roundMap);
      });
      return acc;
    }, new Map())
  ).map(([tag, roundsMap]) => ({
    club: tag,
    tags: Array.from(roundsMap.entries()).map(([round, value]) => ({ tag: round, value }))
  }));

  const recurring = aggregateCounts(
    filteredIssues.filter((issue) => issue.isRecurring).map((issue) => issue.normalizedSummary ?? "Повторяющаяся проблема")
  );
  const leagueSplit = aggregateCounts(filteredIssues.map((issue) => issue.club.league.name));
  const issueSamples = filteredIssues
    .map((issue) => ({
      id: issue.id,
      clubName: issue.club.name,
      leagueName: issue.club.league.name,
      roundLabel: issue.roundLabel ?? "Без тура",
      description: issue.rawDescription ?? issue.normalizedSummary ?? "Описание не заполнено"
    }))
    .slice(0, 12);

  return {
    season,
    seasons,
    leagues,
    tagStats,
    roundStats,
    clubStats,
    heatmap,
    tagRoundMatrix,
    recurring,
    leagueSplit,
    issueSamples
  };
}

export async function getStadiumStatistics(options?: {
  seasonSlug?: string;
  leagueCode?: string;
}) {
  const season = await getActiveSeason(options?.seasonSlug);
  const seasons = await getSeasonOptions();
  const leagues = await getLeagueOptions();

  const clubsRaw = await prisma.club.findMany({
    include: {
      league: true,
      stadium: {
        include: {
          remarks: {
            include: {
              tag: true
            }
          },
          files: true
        }
      }
    }
  });

  const clubs =
    options?.leagueCode && options.leagueCode !== "all"
      ? clubsRaw.filter((club) => club.league.code === options.leagueCode)
      : clubsRaw;

  const rows = clubs
    .filter((club) => club.stadium)
    .map((club) => ({
      clubName: club.name,
      stadiumName: club.stadium!.name,
      leagueName: club.league.name,
      issueCount: club.stadium!.remarks.length,
      cameraPlanCount: club.stadium!.files.filter((file) => file.kind === "camera_plan").length,
      galleryCount: club.stadium!.files.filter((file) => file.kind === "gallery").length,
      tags: aggregateCounts(club.stadium!.remarks.map((remark) => remark.tag?.labelRu ?? "Без тега"))
    }));

  return {
    season,
    seasons,
    leagues,
    rows,
    tagStats: aggregateCounts(rows.flatMap((row) => row.tags.map((tag) => tag.name))),
    leagueStats: aggregateCounts(rows.map((row) => row.leagueName))
  };
}

export async function getArchiveData(options?: { seasonSlug?: string }) {
  const season = await getActiveSeason(options?.seasonSlug);
  const seasons = await getSeasonOptions();

  if (!season) {
    return { season: null, seasons, issues: [] };
  }

  const issues = await prisma.broadcastIssue.findMany({
    where: {
      seasonId: season.id,
      status: {
        in: ["resolved", "archived"]
      }
    },
    orderBy: { resolvedAt: "desc" },
    include: {
      club: true,
      match: {
        include: {
          homeClub: true,
          awayClub: true
        }
      },
      issueTags: {
        include: {
          tag: true
        }
      }
    }
  });

  return { season, seasons, issues };
}

export async function getTagsDirectory() {
  return prisma.tag.findMany({
    orderBy: { labelRu: "asc" },
    include: {
      _count: {
        select: {
          broadcastIssueTags: true,
          stadiumRemarks: true
        }
      }
    }
  });
}

export async function getAddInfoPageData() {
  const [season, clubs, tags, syncJobs] = await Promise.all([
    getActiveSeason(),
    prisma.club.findMany({
      orderBy: { name: "asc" },
      include: {
        stadium: true,
        league: true,
        leagueGroup: true
      }
    }),
    prisma.tag.findMany({
      orderBy: { labelRu: "asc" }
    }),
    prisma.dataSyncJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);

  const latestMatchesSync = syncJobs.find((job) => job.jobType === "matches" && job.status === "completed");
  const latestBroadcastsSync = syncJobs.find((job) => job.jobType === "broadcasts" && job.status === "completed");

  return {
    season,
    clubs,
    tags,
    syncMeta: {
      lastMatchesSyncAt: latestMatchesSync?.finishedAt ?? latestMatchesSync?.updatedAt ?? null,
      lastBroadcastsSyncAt: latestBroadcastsSync?.finishedAt ?? latestBroadcastsSync?.updatedAt ?? null
    }
  };
}

export async function getMatchesNeedingBroadcastLinks(seasonSlug?: string) {
  const season = await getActiveSeason(seasonSlug);

  if (!season) {
    return {
      season: null,
      matchesWithoutLinks: [],
      matchesRequiringReview: []
    };
  }

  const matches = await prisma.match.findMany({
    where: {
      seasonId: season.id,
      status: { in: ["upcoming", "live"] }
    },
    orderBy: { kickoffAt: "asc" },
    include: {
      league: true,
      homeClub: true,
      awayClub: true
    }
  });

  const matchesWithoutLinks = matches
    .filter((m) => !m.broadcastUrl)
    .map((m) => ({
      id: m.id,
      homeTeam: m.homeClub.name,
      awayTeam: m.awayClub.name,
      kickoffAt: m.kickoffAt,
      league: m.league.name,
      status: m.status,
      currentUrl: null,
      fnlMatchUrl: m.fnlMatchUrl,
      broadcastMatchMode: "none"
    }));

  const matchesRequiringReview = matches
    .filter((m) => m.broadcastMatchMode === "requires_review")
    .map((m) => ({
      id: m.id,
      homeTeam: m.homeClub.name,
      awayTeam: m.awayClub.name,
      kickoffAt: m.kickoffAt,
      league: m.league.name,
      status: m.status,
      currentUrl: m.broadcastUrl,
      fnlMatchUrl: m.fnlMatchUrl,
      broadcastMatchMode: "requires_review"
    }));

  return {
    season,
    matchesWithoutLinks,
    matchesRequiringReview: [...matchesRequiringReview, ...matchesWithoutLinks]
  };
}

export async function getSyncJobsSummary() {
  return prisma.dataSyncJob.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      season: true
    }
  });
}

export async function createBroadcastIssue(input: {
  clubId: string;
  tagId?: string;
  rawDescription?: string;
  createdBy?: string;
  sourceReference?: string;
}) {
  const season = await getActiveSeason();
  const club = await prisma.club.findUnique({
    where: { id: input.clubId },
    include: {
      homeMatches: {
        orderBy: { kickoffAt: "desc" },
        take: 1
      }
    }
  });

  if (!season || !club) {
    throw new Error("Не удалось определить сезон или клуб.");
  }

  const issue = await prisma.broadcastIssue.create({
    data: {
      clubId: club.id,
      seasonId: season.id,
      matchId: club.homeMatches[0]?.id ?? null,
      sourceSystem: "manual",
      sourceReference: input.sourceReference ?? null,
      rawDescription: input.rawDescription || null,
      normalizedSummary: input.rawDescription || "Проблема добавлена вручную",
      status: "new",
      createdBy: input.createdBy || "Внутренний пользователь"
    }
  });

  if (input.tagId) {
    await prisma.broadcastIssueTag.create({
      data: {
        issueId: issue.id,
        tagId: input.tagId,
        isPrimary: true
      }
    });
  }

  await prisma.broadcastIssueHistory.create({
    data: {
      issueId: issue.id,
      actionType: "created",
      actorName: input.createdBy || "Внутренний пользователь",
      comment: "Проблема создана через форму добавления."
    }
  });

  return issue;
}

export async function createManualStadiumFile(input: {
  clubId: string;
  filename: string;
  originalName: string;
  filePath: string;
  mimeType: string;
  comment?: string;
}) {
  const club = await prisma.club.findUnique({
    where: { id: input.clubId },
    include: { stadium: true }
  });

  if (!club?.stadium) {
    throw new Error("У выбранного клуба не найден стадион.");
  }

  const classification = classifyStadiumFile({
    originalName: input.originalName,
    mimeType: input.mimeType,
    comment: input.comment
  });

  const file = await prisma.stadiumFile.create({
    data: {
      clubId: club.id,
      stadiumId: club.stadium.id,
      kind: classification.kind,
      sourceSystem: "manual",
      filename: input.filename,
      originalName: input.originalName,
      filePath: input.filePath,
      mimeType: input.mimeType,
      comment: input.comment ?? null,
      extractedText: `Черновой импорт. ${classification.reason}`
    }
  });

  await prisma.stadiumRemark.create({
    data: {
      stadiumId: club.stadium.id,
      sourceFileId: file.id,
      rawText: input.comment || "Файл загружен вручную. Требуется подтверждение классификации.",
      normalizedText: "Черновой замечание по стадионному файлу. Требуется подтверждение пользователем.",
      status: "draft",
      sourceSystem: "manual"
    }
  });

  return file;
}

export async function updateStadiumFileKind(input: {
  fileId: string;
  kind: StadiumFileKind;
  actorName?: string;
}) {
  const file = await prisma.stadiumFile.findUnique({
    where: { id: input.fileId }
  });

  if (!file) {
    throw new Error("Файл не найден.");
  }

  return prisma.stadiumFile.update({
    where: { id: input.fileId },
    data: {
      kind: input.kind,
      comment: appendReclassificationComment(file.comment, input.kind, input.actorName)
    }
  });
}

export async function resolveBroadcastIssue(input: {
  issueId: string;
  resolvedBy: string;
  resolutionType?: string;
  resolutionComment?: string;
  resolutionSource?: string;
}) {
  const issue = await prisma.broadcastIssue.findUnique({
    where: { id: input.issueId }
  });

  if (!issue) {
    throw new Error("Проблема не найдена.");
  }

  const resolvedAt = new Date();

  const updatedIssue = await prisma.broadcastIssue.update({
    where: { id: input.issueId },
    data: {
      status: "resolved",
      resolvedAt,
      resolvedBy: input.resolvedBy,
      resolutionType: input.resolutionType || null,
      resolutionComment: input.resolutionComment || null,
      resolutionSource: input.resolutionSource || null
    }
  });

  await prisma.broadcastIssueHistory.create({
    data: {
      issueId: issue.id,
      actionType: "resolved",
      actorName: input.resolvedBy,
      oldValue: issue.status,
      newValue: "resolved",
      comment: input.resolutionComment || "Проблема помечена решенной."
    }
  });

  await prisma.resolvedIssueLog.upsert({
    where: { issueId: issue.id },
    update: {
      resolvedAt,
      resolvedBy: input.resolvedBy,
      resolutionType: input.resolutionType || null,
      resolutionComment: input.resolutionComment || null,
      resolutionSource: input.resolutionSource || null
    },
    create: {
      issueId: issue.id,
      resolvedAt,
      resolvedBy: input.resolvedBy,
      resolutionType: input.resolutionType || null,
      resolutionComment: input.resolutionComment || null,
      resolutionSource: input.resolutionSource || null
    }
  });

  return updatedIssue;
}

export async function createTag(input: {
  labelRu: string;
  description?: string;
}) {
  const normalizedLabel = input.labelRu.trim();
  const existing = await prisma.tag.findMany({
    select: {
      id: true,
      code: true,
      labelRu: true
    }
  });

  const duplicate = existing.find((tag) => tag.labelRu.trim().toLocaleLowerCase("ru") === normalizedLabel.toLocaleLowerCase("ru"));

  if (duplicate) {
    throw new Error("Такой тег уже существует.");
  }

  const baseCode = normalizedLabel
    .toLocaleLowerCase("ru")
    .replace(/[^a-zа-я0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "");

  const code = baseCode || `tag_${Date.now()}`;

  return prisma.tag.create({
    data: {
      code,
      labelRu: normalizedLabel,
      description: input.description || null,
      scope: "broadcast",
      isSystem: false
    }
  });
}

function aggregateCounts(values: string[]) {
  return Array.from(
    values.reduce<Map<string, number>>((acc, value) => {
      acc.set(value, (acc.get(value) ?? 0) + 1);
      return acc;
    }, new Map())
  )
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value || left.name.localeCompare(right.name, "ru"));
}

function appendReclassificationComment(currentComment: string | null, kind: StadiumFileKind, actorName?: string) {
  const actor = actorName?.trim() || "Пользователь";
  const line = `Ручная классификация: ${kindLabelMap[kind]} · ${actor}`;

  if (!currentComment?.trim()) {
    return line;
  }

  return `${currentComment}\n${line}`;
}

const kindLabelMap: Record<StadiumFileKind, string> = {
  camera_plan: "Камерплан",
  gallery: "Фото стадиона",
  coordination: "Согласование",
  other: "Прочий материал"
};

export function getStadiumFileViewModel(file: Pick<StadiumFile, "id" | "filePath" | "mimeType" | "sourceUrl" | "kind" | "originalName" | "comment">) {
  const localUrl = `/api/stadium-files/${file.id}/content`;
  const image = isImageFile(file.originalName, file.mimeType);

  return {
    ...file,
    previewUrl: image ? localUrl : null,
    fileUrl: localUrl,
    isImage: image
  };
}
