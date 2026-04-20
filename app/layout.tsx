import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  BookOpen,
  Building2,
  Gauge,
  LayoutDashboard,
  PlusSquare,
  Tags,
  Vault
} from "lucide-react";
import "@/app/globals.css";
import { navigationItems } from "@/lib/constants";

export const metadata: Metadata = {
  title: "ФНЛ | Контроль трансляций",
  description: "Внутренняя система оценки качества трансляций и стадионной информации."
};

const iconMap = {
  "/": LayoutDashboard,
  "/clubs": Building2,
  "/broadcast-statistics": Gauge,
  "/stadium-statistics": Activity,
  "/add": PlusSquare,
  "/archive": Vault,
  "/tags": Tags
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ru">
      <body className="app-shell">
        <div className="mx-auto flex min-h-screen max-w-[1760px] gap-6 px-5 py-5 xl:px-6">
          <aside className="hidden w-[304px] shrink-0 rounded-[28px] border border-white/12 bg-[#101816] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] lg:flex lg:flex-col">
            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.32em] text-[#86a392]">Внутренний контур ФНЛ</p>
                <h1 className="text-2xl font-semibold text-white">Контроль трансляций</h1>
              </div>
            </div>

            <nav className="mt-10 grid gap-2">
              {navigationItems.map((item) => {
                const Icon = iconMap[item.href as keyof typeof iconMap];

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:border-primary/30 hover:bg-primary/[0.08]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-xl bg-white/[0.04] p-2 text-[#bfd6c8] transition group-hover:bg-primary/15 group-hover:text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="space-y-1">
                        <div className="font-medium text-white">{item.label}</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.05] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[#86a392]">Источники данных</p>
              <div className="mt-2 space-y-2 text-sm leading-6 text-[#dce7e1]">
                <div>Сайт ФНЛ</div>
                <div>Таблица</div>
                <div>Яндекс.Диск</div>
              </div>
            </div>
          </aside>

          <div className="flex min-h-[calc(100vh-2.5rem)] flex-1 flex-col rounded-[30px] border border-white/12 bg-[#121c19] shadow-[0_28px_90px_rgba(0,0,0,0.5)]">
            <header className="border-b border-white/6 px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#86a392]">Панель ФНЛ</p>
                </div>
              </div>

              <nav className="mt-4 flex gap-2 overflow-x-auto lg:hidden">
                {navigationItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="whitespace-nowrap rounded-full border border-white/8 bg-white/[0.04] px-3 py-2 text-sm text-[#dce7e1] transition hover:bg-primary/15 hover:text-primary"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </header>

            <main className="flex-1 px-6 py-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
