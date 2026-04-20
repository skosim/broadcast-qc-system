import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value?: Date | string | null) {
  if (!value) {
    return "Не указано";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}

export function formatDateTime(value?: Date | string | null) {
  if (!value) {
    return "Не указано";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow"
  }).format(new Date(value));
}

export function formatNumber(value?: number | null) {
  if (value == null) {
    return "Не указано";
  }

  return new Intl.NumberFormat("ru-RU").format(value);
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export function getMoscowDateRange(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.format(date);
  const start = new Date(`${parts}T00:00:00+03:00`);
  const end = new Date(`${parts}T23:59:59.999+03:00`);
  return { start, end };
}

export function startOfMoscowDay(value: Date | string) {
  const date = new Date(value);
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.format(date);
  return new Date(`${parts}T00:00:00+03:00`);
}

export function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
