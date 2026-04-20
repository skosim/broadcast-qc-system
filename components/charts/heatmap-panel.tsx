import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function HeatmapPanel({
  title,
  description,
  rows
}: {
  title: string;
  description: string;
  rows: Array<{ club: string; tags: Array<{ tag: string; value: number }> }>;
}) {
  const allTags = Array.from(new Set(rows.flatMap((row) => row.tags.map((tag) => tag.tag))));

  const getValue = (rowClub: string, tagLabel: string) =>
    rows.find((row) => row.club === rowClub)?.tags.find((tag) => tag.tag === tagLabel)?.value ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="grid min-w-[760px] gap-2" style={{ gridTemplateColumns: `220px repeat(${allTags.length}, minmax(110px, 1fr))` }}>
          <div />
          {allTags.map((tag) => (
            <div key={tag} className="px-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {tag}
            </div>
          ))}

          {rows.map((row) => (
            <FragmentRow key={row.club}>
              <div className="rounded-xl bg-secondary/60 px-3 py-2 text-sm text-foreground">{row.club}</div>
              {allTags.map((tag) => {
                const value = getValue(row.club, tag);
                return (
                  <div
                    key={`${row.club}-${tag}`}
                    className={cn(
                      "rounded-xl border border-border/60 px-3 py-2 text-center text-sm",
                      value > 0 ? "bg-primary/15 text-primary" : "bg-secondary/20 text-muted-foreground"
                    )}
                  >
                    {value || "—"}
                  </div>
                );
              })}
            </FragmentRow>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
