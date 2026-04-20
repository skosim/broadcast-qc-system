export function normalizeClubName(value?: string | null) {
  return (value ?? "")
    .toLocaleLowerCase("ru")
    .replace(/\bфк\b/g, " ")
    .replace(/ё/g, "е")
    .replace(/[()"'.,]/g, " ")
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildClubAliasVariants(name: string, shortName?: string | null, extraAliases: string[] = []) {
  const variants = new Set<string>([
    name,
    normalizeClubName(name),
    name.replace(/[()]/g, "").replace(/\s+/g, " ").trim(),
    name.replace(/[-–—]/g, " ").replace(/\s+/g, " ").trim()
  ]);

  if (shortName) {
    variants.add(shortName);
    variants.add(normalizeClubName(shortName));
  }

  for (const alias of extraAliases) {
    variants.add(alias);
    variants.add(normalizeClubName(alias));
  }

  return Array.from(variants).filter(Boolean);
}

export function safeParseAliases(aliasesJson?: string | null) {
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
