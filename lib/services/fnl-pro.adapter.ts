import { normalizeClubName } from "@/lib/club-name";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

export type FnlClubSnapshot = {
  leagueCode: string;
  groupCode: string | null;
  league: string;
  group: string | null;
  clubName: string;
  city: string | null;
  stadiumName: string | null;
};

export type FnlMatchSnapshot = {
  externalMatchId: string;
  leagueCode: string;
  groupCode: string | null;
  league: string;
  group: string | null;
  roundLabel: string | null;
  kickoffAt: string;
  homeClub: string;
  awayClub: string;
  stadiumName: string | null;
  delegateName: string | null;
  videoDelegateName: string | null;
  inspectorName: string | null;
  refereeName: string | null;
  matchUrl: string;
  directStreamUrl: string | null;
};

type FnlLeagueApiConfig = {
  leagueId: number;
  leagueCode: string;
  league: string;
  routeSegment: string;
  groupCode: string | null;
  group: string | null;
};

type FnlSeasonInfo = {
  leagueId: number;
  seasonId: number;
  title: string;
};

type FnlGroupInfo = {
  id: number;
  name: string;
  originName: string;
  isDefault: boolean;
};

type FnlMatchInfoCenter = {
  leagueId: number;
  matchId: number;
  status: string;
  statusExtended?: string | null;
  seasonId: number;
  groupId?: number | null;
  group?: string | null;
  tour?: string | null;
  date: string;
  links?: Array<{ url?: string | null; typeLink?: string | null }>;
  media?: Array<{ videoUrl?: string | null; title?: string | null }>;
  stadium?: { title?: string | null; city?: string | null };
  judges?: { name?: string | null };
  home: { name: string };
  guest: { name: string };
};

type FnlCalendarMatchesResponse = {
  location?: {
    count?: number;
  };
  matches?: FnlMatchInfoCenter[];
};

type ResolvedGroup = {
  id: number | null;
  code: string | null;
  name: string | null;
};

const API_BASE = "https://fnl-app.fnl.pro";
const execFileAsync = promisify(execFile);

const leagueSources: FnlLeagueApiConfig[] = [
  {
    leagueId: 100,
    leagueCode: "first-league",
    league: "Первая лига",
    routeSegment: "pari",
    groupCode: "all",
    group: null
  },
  {
    leagueId: 200,
    leagueCode: "second-a",
    league: "Вторая лига А",
    routeSegment: "leon-a",
    groupCode: null,
    group: null
  },
  {
    leagueId: 300,
    leagueCode: "second-b",
    league: "Вторая лига Б",
    routeSegment: "leon-b",
    groupCode: null,
    group: null
  }
];

const fallbackMatches: FnlMatchSnapshot[] = [
  {
    externalMatchId: "f1-221",
    leagueCode: "first-league",
    groupCode: "all",
    league: "Первая лига",
    group: null,
    roundLabel: "27 тур",
    kickoffAt: "2026-04-20T18:00:00+03:00",
    homeClub: "Арсенал",
    awayClub: "Ротор",
    stadiumName: "Арсенал",
    delegateName: "Алексей Нагорный",
    videoDelegateName: "Дмитрий Сотников",
    inspectorName: "Игорь Мельников",
    refereeName: "Павел Шадыханов",
    matchUrl: "https://fnl.pro/pari/matches/221",
    directStreamUrl: null
  },
  {
    externalMatchId: "f2a-g-089",
    leagueCode: "second-a",
    groupCode: "gold",
    league: "Вторая лига А",
    group: "Золото",
    roundLabel: "9 тур",
    kickoffAt: "2026-04-20T15:30:00+03:00",
    homeClub: "Велес",
    awayClub: "Ленинградец",
    stadiumName: "Труд",
    delegateName: "Николай Логинов",
    videoDelegateName: "Роман Чистов",
    inspectorName: "Михаил Егоров",
    refereeName: "Артем Любимов",
    matchUrl: "https://fnl.pro/leon-a/matches/89",
    directStreamUrl: null
  },
  {
    externalMatchId: "f1-216",
    leagueCode: "first-league",
    groupCode: "all",
    league: "Первая лига",
    group: null,
    roundLabel: "26 тур",
    kickoffAt: "2026-04-17T16:00:00+03:00",
    homeClub: "Волга",
    awayClub: "Арсенал",
    stadiumName: "Труд им. Л.И. Яшина",
    delegateName: "Сергей Чернышов",
    videoDelegateName: "Андрей Никитин",
    inspectorName: "Виталий Романов",
    refereeName: "Егор Егоров",
    matchUrl: "https://fnl.pro/pari/matches/6960",
    directStreamUrl: "https://vksport.vkvideo.ru/video-29484355_456251484"
  }
];

export class FnlProAdapter {
  async fetchClubs(): Promise<FnlClubSnapshot[]> {
    const matches = await this.fetchMatches();
    const clubs = new Map<string, FnlClubSnapshot>();

    for (const match of matches) {
      const homeKey = `${match.leagueCode}:${match.groupCode ?? "all"}:${normalizeClubName(match.homeClub)}`;
      const awayKey = `${match.leagueCode}:${match.groupCode ?? "all"}:${normalizeClubName(match.awayClub)}`;

      clubs.set(homeKey, {
        leagueCode: match.leagueCode,
        groupCode: match.groupCode,
        league: match.league,
        group: match.group,
        clubName: match.homeClub,
        city: null,
        stadiumName: match.stadiumName
      });

      clubs.set(awayKey, {
        leagueCode: match.leagueCode,
        groupCode: match.groupCode,
        league: match.league,
        group: match.group,
        clubName: match.awayClub,
        city: null,
        stadiumName: null
      });
    }

    return Array.from(clubs.values()).sort((left, right) => left.clubName.localeCompare(right.clubName, "ru"));
  }

  async fetchMatches(): Promise<FnlMatchSnapshot[]> {
    const liveMatches: FnlMatchSnapshot[] = [];

    for (const source of leagueSources) {
      try {
        await fetchJson<FnlSeasonInfo>(`${API_BASE}/api/v1/info/activeSeason?leagueId=${source.leagueId}`);
        const response = await fetchJson<FnlCalendarMatchesResponse>(
          `${API_BASE}/api/v1/center/calendar/matches/current/with/past?leagueId=${source.leagueId}&limit=400&offset=0`
        );

        for (const match of response.matches ?? []) {
          const group = resolveGroupFromMatch(match, source);
          if (source.leagueCode !== "first-league" && !group.code) {
            continue;
          }
          liveMatches.push(mapApiMatchToSnapshot(match, source, group));
        }
      } catch {
        continue;
      }
    }

    return dedupeMatches(liveMatches.length > 0 ? liveMatches : fallbackMatches);
  }
}

function resolveGroupFromMatch(match: FnlMatchInfoCenter, source: FnlLeagueApiConfig): ResolvedGroup {
  if (source.leagueCode === "first-league") {
    return { id: null, code: source.groupCode, name: source.group };
  }

  const rawGroup = normalizeClubName(match.group ?? "");

  if (source.leagueCode === "second-a") {
    if (rawGroup.includes("golden2stage") || rawGroup.includes("золото")) {
      return { id: match.groupId ?? null, code: "gold", name: "Золото" };
    }
    if (rawGroup.includes("silver2stage") || rawGroup.includes("серебро")) {
      return { id: match.groupId ?? null, code: "silver", name: "Серебро" };
    }
    return { id: match.groupId ?? null, code: null, name: null };
  }

  const directGroup = String(match.group ?? "").trim();
  if (["1", "2", "3", "4"].includes(directGroup)) {
    return { id: match.groupId ?? null, code: `group-${directGroup}`, name: `Группа ${directGroup}` };
  }

  return { id: match.groupId ?? null, code: null, name: null };
}

function mapApiMatchToSnapshot(match: FnlMatchInfoCenter, source: FnlLeagueApiConfig, group: ResolvedGroup): FnlMatchSnapshot {
  return {
    externalMatchId: `${source.leagueCode}-${match.matchId}`,
    leagueCode: source.leagueCode,
    groupCode: group.code,
    league: source.league,
    group: group.name,
    roundLabel: cleanupRoundLabel(match.tour),
    kickoffAt: parseFnlDateTime(match.date),
    homeClub: cleanupTeamName(match.home.name),
    awayClub: cleanupTeamName(match.guest.name),
    stadiumName: match.stadium?.title?.trim() ?? null,
    delegateName: null,
    videoDelegateName: null,
    inspectorName: null,
    refereeName: cleanupPersonName(match.judges?.name),
    matchUrl: `https://fnl.pro/${source.routeSegment}/matches/${match.matchId}`,
    directStreamUrl: resolveDirectStreamUrl(match)
  };
}

function resolveDirectStreamUrl(match: FnlMatchInfoCenter) {
  const directLink = (match.links ?? [])
    .map((link) => link.url?.trim())
    .find((url): url is string => Boolean(url));

  if (directLink) {
    return directLink;
  }

  const mediaLink = (match.media ?? [])
    .map((item) => normalizeVideoUrl(item.videoUrl))
    .find((url): url is string => Boolean(url));

  return mediaLink ?? null;
}

function normalizeVideoUrl(url?: string | null) {
  if (!url) {
    return null;
  }

  const trimmed = url.trim();
  const extMatch = trimmed.match(/video_ext\.php\?[^#]*oid=([-0-9]+)&id=([0-9]+)/i);
  if (extMatch) {
    return `https://vksport.vkvideo.ru/video${extMatch[1]}_${extMatch[2]}`;
  }

  if (/vkvideo\.ru|vksport\.vkvideo\.ru|vk\.com\/video/i.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
}

function parseFnlDateTime(value: string) {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(trimmed)) {
    return trimmed.replace(" ", "T") + ":00+03:00";
  }
  return new Date(trimmed).toISOString();
}

function cleanupRoundLabel(value?: string | null) {
  if (!value) {
    return null;
  }
  return value.replace(/-й/g, "").replace(/\s+/g, " ").trim();
}

function cleanupTeamName(name: string) {
  return name.replace(/\s+/g, " ").trim();
}

function cleanupPersonName(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim() ?? null;
}

async function fetchJson<T>(url: string): Promise<T> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FNL Dashboard Bot/1.0)",
        Accept: "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`FNL API ${url} returned ${response.status}`);
    }

    return response.json() as Promise<T>;
  } catch {
    const { stdout } = await execFileAsync("curl", ["-s", "-L", "-A", "Mozilla/5.0", url], {
      maxBuffer: 20 * 1024 * 1024
    });
    return JSON.parse(stdout) as T;
  }
}

function dedupeMatches(matches: FnlMatchSnapshot[]) {
  const map = new Map<string, FnlMatchSnapshot>();

  for (const match of matches) {
    const key = match.externalMatchId || `${match.leagueCode}:${match.groupCode ?? "all"}:${match.kickoffAt}:${normalizeClubName(match.homeClub)}:${normalizeClubName(match.awayClub)}`;
    if (!map.has(key)) {
      map.set(key, match);
    }
  }

  return Array.from(map.values()).sort((left, right) => left.kickoffAt.localeCompare(right.kickoffAt));
}
