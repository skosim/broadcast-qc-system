import Link from "next/link";
import { cn } from "@/lib/utils";

type FilterItem = {
  key: string;
  label: string;
};

export function FilterLinkGroup({
  items,
  activeKey,
  basePath,
  paramName,
  extraParams
}: {
  items: FilterItem[];
  activeKey: string;
  basePath: string;
  paramName: string;
  extraParams?: Record<string, string | undefined>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const params = new URLSearchParams();
        params.set(paramName, item.key);
        Object.entries(extraParams ?? {}).forEach(([key, value]) => {
          if (value) {
            params.set(key, value);
          }
        });

        return (
          <Link
            key={item.key}
            href={`${basePath}?${params.toString()}`}
            className={cn(
              "rounded-full border px-3 py-2 text-sm transition",
              activeKey === item.key
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border/80 bg-secondary/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
