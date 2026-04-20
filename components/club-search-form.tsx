import Link from "next/link";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ClubSearchForm({
  basePath,
  searchValue,
  hiddenParams,
  placeholder = "Поиск клуба"
}: {
  basePath: string;
  searchValue?: string;
  hiddenParams?: Record<string, string | undefined>;
  placeholder?: string;
}) {
  return (
    <form action={basePath} method="get" className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {Object.entries(hiddenParams ?? {}).map(([key, value]) =>
        value ? <input key={key} type="hidden" name={key} value={value} /> : null
      )}

      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="search"
          defaultValue={searchValue}
          placeholder={placeholder}
          className="pl-10"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit">Найти</Button>
        {searchValue ? (
          <Button asChild type="button" variant="outline">
            <Link href={buildClearHref(basePath, hiddenParams)}>
              <X className="mr-2 h-4 w-4" />
              Сбросить
            </Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function buildClearHref(basePath: string, hiddenParams?: Record<string, string | undefined>) {
  const params = new URLSearchParams();

  Object.entries(hiddenParams ?? {}).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
