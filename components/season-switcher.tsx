import Link from "next/link";
import { cn } from "@/lib/utils";

type SeasonOption = {
  slug: string;
  name: string;
  isCurrent: boolean;
};

export function SeasonSwitcher({
  seasons,
  activeSlug,
  basePath,
  extraParams
}: {
  seasons: SeasonOption[];
  activeSlug?: string;
  basePath: string;
  extraParams?: Record<string, string | undefined>;
}) {
  const buildHref = (slug: string) => {
    const params = new URLSearchParams();
    params.set("season", slug);

    Object.entries(extraParams ?? {}).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });

    return `${basePath}?${params.toString()}`;
  };

  return (
    <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-border/80 bg-secondary/70 p-1.5">
      {seasons.map((season) => {
        const isActive = (activeSlug ?? seasons.find((item) => item.isCurrent)?.slug) === season.slug;

        return (
          <Link
            key={season.slug}
            href={buildHref(season.slug)}
            className={cn(
              "rounded-xl px-3 py-2 text-sm transition",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {season.name}
          </Link>
        );
      })}
    </div>
  );
}
