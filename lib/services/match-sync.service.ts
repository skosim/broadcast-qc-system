import type { League, LeagueGroup, Match, Season } from "@prisma/client";
import { BroadcastMatchMode, BroadcastSource, SourceSystem, SyncStatus } from "@prisma/client";
import { normalizeClubName } from "@/lib/club-name";
import { prisma } from "@/lib/prisma";
import { FnlProAdapter, type FnlMatchSnapshot } from "@/lib/services/fnl-pro.adapter";
import { buildClubResolverIndex, resolveClubFromIndex } from "@/lib/services/club-resolver.service";
import { VkVideoAdapter, type VkBroadcastCandidate } from "@/lib/services/vk-video.adapter";

type MatchReviewItem = {
  matchId: string;
  reason: string;
};

const fnlAdapter = new FnlProAdapter();
const vkAdapter = new VkVideoAdapter();

export async function syncMatchesFromFnl(seasonSlug?: string) {
  const season = await resolveSeason(seasonSlug);
  if (!season) {
    throw new Error("Не найден активный сезон.");
  }

  const [leagues, groups, resolver] = await Promise.all([
    prisma.league.findMany(),
    prisma.leagueGroup.findMany(),
    buildClubResolverIndex()
  ]);

  const leagueByCode = new Map(leagues.map((league) => [league.code, league]));
  const groupByLeagueAndCode = new Map(groups.map((group) => [`${group.leagueId}:${group.code}`, group]));
  const snapshots = await fnlAdapter.fetchMatches();

  const job = await prisma.dataSyncJob.create({
    data: {
      seasonId: season.id,
      sourceSystem: SourceSystem.fnl_pro,
      jobType: "matches",
      status: SyncStatus.processing,
      startedAt: new Date(),
      itemsFound: snapshots.length
    }
  });

  let itemsCreated = 0;
  let itemsUpdated = 0;
  const syncedExternalIds = new Set<string>();

  try {
    for (const snapshot of snapshots) {
      syncedExternalIds.add(snapshot.externalMatchId);

      const league = leagueByCode.get(snapshot.leagueCode);
      if (!league) {
        continue;
      }

      const group = snapshot.groupCode ? groupByLeagueAndCode.get(`${league.id}:${snapshot.groupCode}`) ?? null : null;
      const homeClub = resolveClubFromIndex(snapshot.homeClub, resolver, { leagueId: league.id, leagueGroupId: group?.id ?? null });
      const awayClub = resolveClubFromIndex(snapshot.awayClub, resolver, { leagueId: league.id, leagueGroupId: group?.id ?? null });

      if (!homeClub || !awayClub) {
        continue;
      }

      const kickoffAt = new Date(snapshot.kickoffAt);
      const canonicalKey = buildCanonicalKey({
        leagueCode: snapshot.leagueCode,
        matchDate: kickoffAt,
        homeClubName: homeClub.name,
        awayClubName: awayClub.name
      });

      const matchLookupConditions: Array<
        | { externalMatchId: string }
        | { canonicalKey: string }
        | { fnlMatchUrl: string }
      > = [{ externalMatchId: snapshot.externalMatchId }, { canonicalKey }];

      if (snapshot.matchUrl) {
        matchLookupConditions.push({ fnlMatchUrl: snapshot.matchUrl });
      }

      const existing = await prisma.match.findFirst({
        where: {
          OR: matchLookupConditions
        }
      });

      const payload = {
        seasonId: season.id,
        leagueId: league.id,
        leagueGroupId: group?.id ?? null,
        homeClubId: homeClub.id,
        awayClubId: awayClub.id,
        roundLabel: extractRoundLabel(snapshot),
        kickoffAt,
        matchDate: toStartOfDay(kickoffAt),
        matchTime: formatTime(kickoffAt),
        status: mapSnapshotStatus(snapshot, kickoffAt),
        externalMatchId: snapshot.externalMatchId,
        canonicalKey,
        fnlMatchUrl: snapshot.matchUrl,
        broadcastUrl: existing?.broadcastLocked
          ? existing.broadcastUrl
          : snapshot.directStreamUrl ?? existing?.broadcastUrl ?? null,
        broadcastSource:
          existing?.broadcastLocked && existing.broadcastSource
            ? existing.broadcastSource
            : snapshot.directStreamUrl
              ? BroadcastSource.fnl
              : existing?.broadcastSource ?? null,
        delegateName: snapshot.delegateName,
        videoDelegateName: snapshot.videoDelegateName,
        inspectorName: snapshot.inspectorName,
        refereeName: snapshot.refereeName
      };

      if (existing) {
        await prisma.match.update({
          where: { id: existing.id },
          data: payload
        });
        itemsUpdated += 1;
      } else {
        await prisma.match.create({
          data: payload
        });
        itemsCreated += 1;
      }

      const existingSnapshot = await prisma.externalSourceSnapshot.findFirst({
        where: {
          sourceSystem: SourceSystem.fnl_pro,
          entityType: "match",
          externalKey: snapshot.externalMatchId
        }
      });

      if (existingSnapshot) {
        await prisma.externalSourceSnapshot.update({
          where: { id: existingSnapshot.id },
          data: {
            syncJobId: job.id,
            payloadJson: JSON.stringify(snapshot)
          }
        });
      } else {
        await prisma.externalSourceSnapshot.create({
          data: {
            syncJobId: job.id,
            seasonId: season.id,
            sourceSystem: SourceSystem.fnl_pro,
            entityType: "match",
            externalKey: snapshot.externalMatchId,
            payloadJson: JSON.stringify(snapshot)
          }
        });
      }
    }

    await prisma.match.deleteMany({
      where: {
        seasonId: season.id,
        broadcastLocked: false,
        OR: [
          { externalMatchId: { startsWith: "f1-" } },
          { externalMatchId: { startsWith: "f2a-" } },
          { externalMatchId: { startsWith: "f2b-" } }
        ],
        NOT: {
          externalMatchId: {
            in: Array.from(syncedExternalIds)
          }
        }
      }
    });

    return prisma.dataSyncJob.update({
      where: { id: job.id },
      data: {
        status: SyncStatus.completed,
        finishedAt: new Date(),
        itemsCreated,
        itemsUpdated,
        detailsJson: JSON.stringify({
          sourceUrls: [
            "https://fnl.pro/pari/matches",
            "https://fnl.pro/leon-a/matches",
            "https://fnl.pro/leon-b/matches"
          ]
        })
      }
    });
  } catch (error) {
    await prisma.dataSyncJob.update({
      where: { id: job.id },
      data: {
        status: SyncStatus.failed,
        finishedAt: new Date(),
        itemsCreated,
        itemsUpdated,
        errorMessage: error instanceof Error ? error.message : "Неизвестная ошибка синхронизации матчей."
      }
    });
    throw error;
  }
}

export async function syncBroadcastLinks(seasonSlug?: string) {
  const season = await resolveSeason(seasonSlug);
  if (!season) {
    throw new Error("Не найден активный сезон.");
  }

  const [matches, resolver] = await Promise.all([
    prisma.match.findMany({
      where: { seasonId: season.id },
      include: {
        league: true,
        leagueGroup: true,
        homeClub: true,
        awayClub: true
      }
    }),
    buildClubResolverIndex()
  ]);

  const candidates = await vkAdapter.fetchBroadcastCandidates();
  const job = await prisma.dataSyncJob.create({
    data: {
      seasonId: season.id,
      sourceSystem: SourceSystem.vk_video,
      jobType: "broadcasts",
      status: SyncStatus.processing,
      startedAt: new Date(),
      itemsFound: candidates.length
    }
  });

  let itemsUpdated = 0;
  let itemsFlagged = 0;
  const flagged: MatchReviewItem[] = [];

  try {
    for (const match of matches) {
      if (match.broadcastLocked) {
        continue;
      }

      const result = matchBroadcastCandidate({
        match,
        candidates,
        resolver
      });

      if (!result) {
        await prisma.match.update({
          where: { id: match.id },
          data: {
            lastCheckedAt: new Date(),
            broadcastReviewReason: null,
            broadcastMatchMode:
              match.broadcastUrl && !match.broadcastMatchedManually ? BroadcastMatchMode.high_confidence_auto_match : match.broadcastMatchMode
          }
        });
        continue;
      }

      if (
        match.broadcastSource === BroadcastSource.fnl &&
        match.broadcastUrl &&
        result.mode === BroadcastMatchMode.requires_review
      ) {
        await prisma.match.update({
          where: { id: match.id },
          data: {
            broadcastMatchMode: BroadcastMatchMode.high_confidence_auto_match,
            broadcastConfidence: 0.95,
            broadcastReviewReason: null,
            lastCheckedAt: new Date()
          }
        });
        continue;
      }

      if (result.mode === BroadcastMatchMode.requires_review) {
        itemsFlagged += 1;
        flagged.push({ matchId: match.id, reason: result.reason ?? "Найден спорный кандидат" });
        await prisma.match.update({
          where: { id: match.id },
          data: {
            broadcastUrl: result.url ?? match.broadcastUrl,
            broadcastSource: result.url ? BroadcastSource.vk_video : match.broadcastSource,
            broadcastMatchMode: BroadcastMatchMode.requires_review,
            broadcastConfidence: result.confidence,
            broadcastReviewReason: result.reason,
            lastCheckedAt: new Date()
          }
        });
        continue;
      }

      if (match.broadcastMatchedManually && match.broadcastLocked) {
        continue;
      }

      await prisma.match.update({
        where: { id: match.id },
        data: {
          broadcastUrl: result.url,
          broadcastSource: BroadcastSource.vk_video,
          broadcastMatchMode: result.mode,
          broadcastConfidence: result.confidence,
          broadcastReviewReason: null,
          lastCheckedAt: new Date()
        }
      });
      itemsUpdated += 1;
    }

    return prisma.dataSyncJob.update({
      where: { id: job.id },
      data: {
        status: SyncStatus.completed,
        finishedAt: new Date(),
        itemsUpdated,
        itemsFlagged,
        detailsJson: JSON.stringify({
          sourceUrls: [
            "https://vkvideo.ru/@liga_pari/lives",
            "https://vkvideo.ru/@fnleague2/lives",
            "https://vkvideo.ru/@fnleague2b/lives"
          ],
          flagged
        })
      }
    });
  } catch (error) {
    await prisma.dataSyncJob.update({
      where: { id: job.id },
      data: {
        status: SyncStatus.failed,
        finishedAt: new Date(),
        itemsUpdated,
        itemsFlagged,
        errorMessage: error instanceof Error ? error.message : "Неизвестная ошибка синхронизации трансляций."
      }
    });
    throw error;
  }
}

export async function updateMatchBroadcastReview(input: {
  matchId: string;
  action: "confirm" | "replace" | "reject";
  actorName?: string;
  broadcastUrl?: string;
  lock?: boolean;
}) {
  const match = await prisma.match.findUnique({
    where: { id: input.matchId }
  });

  if (!match) {
    throw new Error("Матч не найден.");
  }

  if (input.action === "reject") {
    return prisma.match.update({
      where: { id: match.id },
      data: {
        broadcastUrl: null,
        broadcastSource: null,
        broadcastMatchMode: BroadcastMatchMode.rejected,
        broadcastReviewReason: "Кандидат на трансляцию отклонен вручную.",
        broadcastConfidence: null,
        broadcastMatchedManually: true,
        broadcastLocked: input.lock ?? true,
        lastCheckedAt: new Date()
      }
    });
  }

  const url = input.broadcastUrl?.trim() || match.broadcastUrl;
  if (!url) {
    throw new Error("Для подтверждения или замены нужна ссылка на трансляцию.");
  }

  return prisma.match.update({
    where: { id: match.id },
    data: {
      broadcastUrl: url,
      broadcastSource: input.action === "replace" ? BroadcastSource.manual : match.broadcastSource ?? BroadcastSource.manual,
      broadcastMatchMode:
        input.action === "replace" ? BroadcastMatchMode.manual_replaced : BroadcastMatchMode.manual_confirmed,
      broadcastMatchedManually: true,
      broadcastLocked: input.lock ?? true,
      broadcastReviewReason: null,
      broadcastConfidence: 1,
      lastCheckedAt: new Date()
    }
  });
}

function matchBroadcastCandidate(input: {
  match: Match & {
    league: League;
    leagueGroup: LeagueGroup | null;
    homeClub: { id: string; name: string };
    awayClub: { id: string; name: string };
  };
  candidates: VkBroadcastCandidate[];
  resolver: Awaited<ReturnType<typeof buildClubResolverIndex>>;
}) {
  const relevantCandidates = input.candidates
    .filter((candidate) => candidate.leagueCode === input.match.league.code)
    .map((candidate) => {
      const homeClub = candidate.homeClub
        ? resolveClubFromIndex(candidate.homeClub, input.resolver, { leagueId: input.match.leagueId, leagueGroupId: input.match.leagueGroupId ?? null })
        : null;
      const awayClub = candidate.awayClub
        ? resolveClubFromIndex(candidate.awayClub, input.resolver, { leagueId: input.match.leagueId, leagueGroupId: input.match.leagueGroupId ?? null })
        : null;
      const scheduledAt = new Date(candidate.scheduledAt);
      const dateDistance = Math.abs(toStartOfDay(scheduledAt).getTime() - toStartOfDay(input.match.kickoffAt).getTime()) / 86400000;
      let score = 0;
      let exactTeamMatches = 0;

      if (homeClub?.id === input.match.homeClubId) {
        score += 45;
        exactTeamMatches += 1;
      }
      if (awayClub?.id === input.match.awayClubId) {
        score += 45;
        exactTeamMatches += 1;
      }
      if (dateDistance === 0) score += 20;
      else if (dateDistance <= 1) score += 10;

      if (exactTeamMatches > 0) {
        if (candidate.streamType === "live" || candidate.streamType === "upcoming") score += 10;
        if (candidate.streamType === "archive") score -= 15;
      }

      return {
        candidate,
        score,
        dateDistance,
        exactTeamMatches,
        exactTeams: homeClub?.id === input.match.homeClubId && awayClub?.id === input.match.awayClubId,
        clubsResolved: Boolean(homeClub && awayClub)
      };
    })
    .filter((item) => item.exactTeamMatches > 0 && item.score >= 55)
    .sort((left, right) => right.score - left.score || left.dateDistance - right.dateDistance);

  const best = relevantCandidates[0];
  const second = relevantCandidates[1];

  if (!best) {
    return null;
  }

  if (best.exactTeams && best.dateDistance <= 1 && !second) {
    return {
      mode: BroadcastMatchMode.auto_exact,
      url: best.candidate.url,
      confidence: 1,
      reason: null
    };
  }

  if (
    best.exactTeams &&
    best.clubsResolved &&
    best.score >= 85 &&
    (!second || best.score - second.score >= 20)
  ) {
    return {
      mode: BroadcastMatchMode.high_confidence_auto_match,
      url: best.candidate.url,
      confidence: 0.91,
      reason: null
    };
  }

  if (best.exactTeamMatches === 1 && !best.clubsResolved) {
    return null;
  }

  return {
    mode: BroadcastMatchMode.requires_review,
    url: best.candidate.url,
    confidence: Math.min(best.score / 100, 0.89),
    reason: buildReviewReason(best, second)
  };
}

function buildReviewReason(
  best: { candidate: VkBroadcastCandidate; exactTeams: boolean; clubsResolved: boolean; dateDistance: number },
  second?: { candidate: VkBroadcastCandidate; score: number }
) {
  if (!best.clubsResolved) {
    return "Одна из команд определена неуверенно.";
  }
  if (!best.exactTeams) {
    return "Найден кандидат с неточным совпадением домашней и гостевой команды.";
  }
  if (best.dateDistance > 1) {
    return "Дата найденной трансляции заметно расходится с датой матча.";
  }
  if (best.candidate.streamType === "archive") {
    return "Найден вероятный архив или запись вместо нужного лайва.";
  }
  if (second) {
    return "Найдено несколько конкурирующих кандидатных ссылок.";
  }
  return "Нужна ручная проверка ссылки на трансляцию.";
}

function buildCanonicalKey(input: {
  leagueCode: string;
  matchDate: Date;
  homeClubName: string;
  awayClubName: string;
}) {
  return [
    input.leagueCode,
    input.matchDate.toISOString().slice(0, 10),
    normalizeClubName(input.homeClubName),
    normalizeClubName(input.awayClubName)
  ].join(":");
}

function extractRoundLabel(snapshot: FnlMatchSnapshot) {
  return snapshot.roundLabel ?? null;
}

function mapSnapshotStatus(_snapshot: FnlMatchSnapshot, kickoffAt: Date) {
  const now = Date.now();
  if (kickoffAt.getTime() > now) {
    return "upcoming" as const;
  }
  if (kickoffAt.getTime() <= now && kickoffAt.getTime() >= now - 2 * 60 * 60 * 1000) {
    return "live" as const;
  }
  return "finished" as const;
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow"
  }).format(value);
}

function toStartOfDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

async function resolveSeason(seasonSlug?: string): Promise<Season | null> {
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
