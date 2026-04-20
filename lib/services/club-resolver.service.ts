import type { Club, ClubAlias } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeClubName, safeParseAliases } from "@/lib/club-name";

export type ResolvedClub = Pick<
  Club,
  "id" | "name" | "nameNormalized" | "shortName" | "slug" | "aliasesJson" | "leagueId" | "leagueGroupId"
> & {
  aliases: Pick<ClubAlias, "alias" | "aliasNormalized" | "isPrimary">[];
};

type ClubResolverEntry = {
  club: ResolvedClub;
  normalizedVariants: Set<string>;
};

export async function buildClubResolverIndex() {
  const clubs = await prisma.club.findMany({
    include: {
      aliases: {
        orderBy: [{ isPrimary: "desc" }, { alias: "asc" }]
      }
    }
  });

  return clubs.map<ClubResolverEntry>((club) => {
    const normalizedVariants = new Set<string>([
      normalizeClubName(club.name),
      normalizeClubName(club.nameNormalized),
      normalizeClubName(club.shortName ?? ""),
      ...club.aliases.map((alias) => normalizeClubName(alias.aliasNormalized || alias.alias)),
      ...safeParseAliases(club.aliasesJson).map((alias) => normalizeClubName(alias))
    ].filter(Boolean));

    return {
      club,
      normalizedVariants
    };
  });
}

export function resolveClubFromIndex(
  name: string,
  index: ClubResolverEntry[],
  scope?: {
    leagueId?: string | null;
    leagueGroupId?: string | null;
  }
) {
  const normalized = normalizeClubName(name);

  const scoped = index.filter((item) => {
    if (scope?.leagueId && item.club.leagueId !== scope.leagueId) {
      return false;
    }
    if (scope?.leagueGroupId && item.club.leagueGroupId && item.club.leagueGroupId !== scope.leagueGroupId) {
      return false;
    }
    return true;
  });

  return (
    scoped.find((item) => item.normalizedVariants.has(normalized)) ??
    index.find((item) => item.normalizedVariants.has(normalized))
  )?.club ?? null;
}
