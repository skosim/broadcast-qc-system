import type { NavigationItem } from "@/lib/types";

export const navigationItems: NavigationItem[] = [
  {
    href: "/",
    label: "Обзор"
  },
  {
    href: "/clubs",
    label: "Клубы"
  },
  {
    href: "/broadcast-statistics",
    label: "Статистика трансляций"
  },
  {
    href: "/stadium-statistics",
    label: "Статистика стадионов"
  },
  {
    href: "/add",
    label: "Добавить информацию"
  },
  {
    href: "/archive",
    label: "Архив проблем"
  },
  {
    href: "/tags",
    label: "Справочник тегов"
  }
];

export const issueStatusLabels: Record<string, string> = {
  new: "Новая",
  in_review: "На проверке",
  resolved: "Решена",
  archived: "В архиве"
};

export const matchStatusLabels: Record<string, string> = {
  upcoming: "Скоро",
  live: "Идет",
  finished: "Завершен"
};

export const syncStatusLabels: Record<string, string> = {
  queued: "В очереди",
  processing: "В работе",
  completed: "Завершено",
  failed: "Ошибка"
};

export const leagueFilterItems = [
  { code: "all", label: "Все ФНЛ" },
  { code: "first-league", label: "Первая лига" },
  { code: "second-a", label: "Вторая лига А" },
  { code: "second-b", label: "Вторая лига Б" }
];

export const clubQuickFilters = [
  { key: "all", label: "Все клубы" },
  { key: "unresolved", label: "Только с нерешенными проблемами" },
  { key: "recent", label: "Только с проблемами за последние 3 матча" },
  { key: "repeating", label: "Только с повторяющимися проблемами" }
];
