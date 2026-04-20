import { normalizeClubName } from "@/lib/club-name";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

export type VkBroadcastCandidate = {
  externalId: string;
  leagueCode: string;
  title: string;
  url: string;
  scheduledAt: string;
  streamType: "upcoming" | "live" | "archive";
  homeClub?: string | null;
  awayClub?: string | null;
};

type VkSourceConfig = {
  leagueCode: string;
  urls: string[];
};

const vkSources: VkSourceConfig[] = [
  {
    leagueCode: "first-league",
    urls: ["https://vkvideo.ru/@liga_pari/lives"]
  },
  {
    leagueCode: "second-a",
    urls: ["https://vkvideo.ru/@fnleague2/lives"]
  },
  {
    leagueCode: "second-b",
    urls: ["https://vkvideo.ru/@fnleague2b/lives"]
  }
];

const fallbackCandidates: VkBroadcastCandidate[] = [
  {
    externalId: "vk-first-221",
    leagueCode: "first-league",
    title: "Арсенал — Ротор | 27 тур",
    url: "https://vkvideo.ru/video-221",
    scheduledAt: "2026-04-20T18:00:00+03:00",
    streamType: "upcoming",
    homeClub: "Арсенал",
    awayClub: "Ротор"
  },
  {
    externalId: "vk-second-a-gold-089",
    leagueCode: "second-a",
    title: "Велес — Ленинградец | LEON-Вторая Лига А",
    url: "https://vkvideo.ru/video-veles-leningradets",
    scheduledAt: "2026-04-20T15:30:00+03:00",
    streamType: "live",
    homeClub: "Велес",
    awayClub: "Ленинградец"
  },
  {
    externalId: "vk-first-216-delayed",
    leagueCode: "first-league",
    title: "Волга — Арсенал | трансляция матча",
    url: "https://vksport.vkvideo.ru/video-29484355_456251484",
    scheduledAt: "2026-04-17T19:00:00+03:00",
    streamType: "live",
    homeClub: "Волга",
    awayClub: "Арсенал"
  }
];
const execFileAsync = promisify(execFile);

export class VkVideoAdapter {
  async fetchBroadcastCandidates(): Promise<VkBroadcastCandidate[]> {
    const liveCandidates: VkBroadcastCandidate[] = [];

    for (const source of vkSources) {
      for (const url of source.urls) {
        const html = await fetchPageHtml(url).catch(() => null);
        if (!html) {
          continue;
        }

        const parsed = parseVkCandidatesFromHtml(html, source.leagueCode);
        if (parsed.length > 0) {
          liveCandidates.push(...parsed);
          break;
        }
      }
    }

    return dedupeCandidates(liveCandidates.length > 0 ? liveCandidates : fallbackCandidates);
  }
}

function parseVkCandidatesFromHtml(html: string, leagueCode: string) {
  const parsed = [
    ...parseStructuredPayloads(html, leagueCode),
    ...parseVideoLinksFromHtml(html, leagueCode)
  ];

  return dedupeCandidates(parsed);
}

function parseStructuredPayloads(html: string, leagueCode: string) {
  const payloads = extractJsonPayloads(html);
  const parsed: VkBroadcastCandidate[] = [];

  for (const payload of payloads) {
    visitValue(payload, (value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return;
      }

      const object = value as Record<string, unknown>;
      const title = readString(object, ["title", "name", "label", "videoTitle"]);
      const rawUrl = readString(object, ["url", "link", "href", "videoUrl"]);
      if (!title || !rawUrl) {
        return;
      }

      const url = normalizeVkUrl(rawUrl);
      if (!url) {
        return;
      }

      const scheduledAt = normalizeDate(
        readString(object, ["scheduledAt", "startTime", "publishedAt", "date", "createdAt", "start_date"])
      );
      if (!scheduledAt) {
        return;
      }

      const teams = extractTeamsFromTitle(title);
      parsed.push({
        externalId: readExternalId(url),
        leagueCode,
        title: title.trim(),
        url,
        scheduledAt,
        streamType: detectStreamType(object, title),
        homeClub: teams?.homeClub ?? null,
        awayClub: teams?.awayClub ?? null
      });
    });
  }

  return parsed;
}

function parseVideoLinksFromHtml(html: string, leagueCode: string) {
  const parsed: VkBroadcastCandidate[] = [];

  for (const match of html.matchAll(/https?:\/\/(?:vksport\.)?vkvideo\.ru\/video[-0-9_]+/g)) {
    const url = normalizeVkUrl(match[0]);
    if (!url) {
      continue;
    }

    const snippetStart = Math.max(0, match.index - 400);
    const snippetEnd = Math.min(html.length, (match.index ?? 0) + 800);
    const snippet = html.slice(snippetStart, snippetEnd);
    const title = extractTitleFromSnippet(snippet);
    const scheduledAt = normalizeDate(extractDateFromSnippet(snippet));

    if (!title || !scheduledAt) {
      continue;
    }

    const teams = extractTeamsFromTitle(title);
    parsed.push({
      externalId: readExternalId(url),
      leagueCode,
      title,
      url,
      scheduledAt,
      streamType: detectStreamType({}, title),
      homeClub: teams?.homeClub ?? null,
      awayClub: teams?.awayClub ?? null
    });
  }

  return parsed;
}

function extractJsonPayloads(html: string) {
  const payloads: unknown[] = [];
  const scriptMatches = html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi);

  for (const match of scriptMatches) {
    const scriptBody = match[1]?.trim();
    if (!scriptBody) {
      continue;
    }

    const snippets: string[] = [];
    if (scriptBody.startsWith("{") || scriptBody.startsWith("[")) {
      snippets.push(scriptBody);
    }

    for (const snippet of scriptBody.matchAll(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/g)) {
      if (snippet[1]) snippets.push(snippet[1]);
    }

    for (const snippet of scriptBody.matchAll(/window\.__NUXT__\s*=\s*({[\s\S]*?});/g)) {
      if (snippet[1]) snippets.push(snippet[1]);
    }

    for (const snippet of scriptBody.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
      if (snippet[1]) snippets.push(snippet[1]);
    }

    for (const raw of snippets) {
      const parsed = tryParseJson(raw);
      if (parsed) {
        payloads.push(parsed);
      }
    }
  }

  return payloads;
}

function tryParseJson(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function visitValue(value: unknown, visitor: (value: unknown) => void) {
  visitor(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      visitValue(item, visitor);
    }
    return;
  }

  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) {
      visitValue(nested, visitor);
    }
  }
}

function detectStreamType(object: Record<string, unknown>, title: string): "upcoming" | "live" | "archive" {
  const status = normalizeClubName(readString(object, ["status", "type", "liveStatus"]) ?? "");
  const normalizedTitle = normalizeClubName(title);

  if (
    status.includes("upcoming") ||
    normalizedTitle.includes("анонс") ||
    normalizedTitle.includes("скоро") ||
    normalizedTitle.includes("прямая трансляция")
  ) {
    return "upcoming";
  }
  if (
    status.includes("archive") ||
    normalizedTitle.includes("запись") ||
    normalizedTitle.includes("обзор") ||
    normalizedTitle.includes("повтор")
  ) {
    return "archive";
  }
  return "live";
}

function extractTeamsFromTitle(title: string) {
  const cleaned = title.replace(/[«»"]/g, "");
  const match = cleaned.match(/(.+?)\s+[—-]\s+(.+?)(?:\s+\||$)/);
  if (!match) {
    return null;
  }
  return {
    homeClub: cleanupTeamName(match[1]),
    awayClub: cleanupTeamName(match[2])
  };
}

function extractTitleFromSnippet(snippet: string) {
  const patterns = [
    /"title":"([^"]+)"/,
    /"name":"([^"]+)"/,
    />([^<>]{8,120}[—-][^<>]{3,120})</
  ];

  for (const pattern of patterns) {
    const match = snippet.match(pattern);
    if (match?.[1]) {
      return decodeHtml(match[1]).trim();
    }
  }

  return null;
}

function extractDateFromSnippet(snippet: string) {
  const patterns = [
    /"publishedAt":"([^"]+)"/,
    /"startTime":"([^"]+)"/,
    /"scheduledAt":"([^"]+)"/,
    /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\+\d{2}:\d{2}|Z))/,
    /(\d{4}-\d{2}-\d{2} \d{2}:\d{2})/
  ];

  for (const pattern of patterns) {
    const match = snippet.match(pattern);
    if (match?.[1]) {
      return decodeHtml(match[1]).trim();
    }
  }

  return null;
}

function normalizeDate(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(trimmed)) {
    return trimmed.replace(" ", "T") + ":00+03:00";
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function normalizeVkUrl(url: string) {
  const trimmed = decodeHtml(url).trim();

  const extMatch = trimmed.match(/video_ext\.php\?[^#]*oid=([-0-9]+)&id=([0-9]+)/i);
  if (extMatch) {
    return `https://vksport.vkvideo.ru/video${extMatch[1]}_${extMatch[2]}`;
  }

  const directMatch = trimmed.match(/https?:\/\/(?:vksport\.)?vkvideo\.ru\/video[-0-9_]+/i);
  if (directMatch) {
    return directMatch[0];
  }

  const classicMatch = trimmed.match(/https?:\/\/vk\.com\/video([-0-9_]+)/i);
  if (classicMatch) {
    return `https://vksport.vkvideo.ru/video${classicMatch[1]}`;
  }

  return null;
}

function readString(object: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = object[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function readExternalId(url: string) {
  const match = url.match(/video[-_/0-9]+/);
  return match?.[0] ?? url;
}

function cleanupTeamName(name: string) {
  return decodeHtml(name).replace(/\s+/g, " ").trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&#x2F;/g, "/")
    .replace(/&amp;/g, "&");
}

async function fetchPageHtml(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FNL Dashboard Bot/1.0)"
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      throw new Error(`VK source ${url} returned ${response.status}`);
    }

    return response.text();
  } catch {
    const { stdout } = await execFileAsync(
      "curl",
      ["-s", "-L", "--connect-timeout", "2", "--max-time", "3", "-A", "Mozilla/5.0", url],
      {
      maxBuffer: 20 * 1024 * 1024
      }
    );

    if (!stdout.trim()) {
      throw new Error(`VK source ${url} returned empty response`);
    }

    return stdout;
  }
}

function dedupeCandidates(candidates: VkBroadcastCandidate[]) {
  const map = new Map<string, VkBroadcastCandidate>();
  for (const candidate of candidates) {
    const key = candidate.externalId || `${candidate.leagueCode}:${normalizeClubName(candidate.title)}`;
    if (!map.has(key)) {
      map.set(key, candidate);
    }
  }
  return Array.from(map.values());
}
