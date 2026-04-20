export type StatusTone = "success" | "warning" | "danger" | "neutral" | "info";

export type DashboardMetric = {
  label: string;
  value: string;
  hint: string;
};

export type NavigationItem = {
  href: string;
  label: string;
  description?: string;
};
