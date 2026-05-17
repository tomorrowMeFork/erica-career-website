"use client";

import { BookOpenCheckIcon, BriefcaseBusinessIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Button } from "../ui/button.js";
import { Separator } from "../ui/separator.js";
import { cn } from "../../lib/utils.js";

const navigationItems = [
  { label: "커리어 상담", href: "/consultation", icon: BriefcaseBusinessIcon },
  { label: "참고한 정보", href: "/references", icon: BookOpenCheckIcon },
  { label: "설정", href: "/settings", icon: SettingsIcon },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen px-4 pt-4 pb-4 text-foreground md:px-6 md:pt-5 md:pb-6 lg:px-7 lg:pt-6">
      <header
        className="sticky top-3 z-30 mx-auto mb-8 flex min-h-16 w-full max-w-[var(--container-max)] items-center justify-between gap-4 rounded-xl border border-border/80 bg-card/95 px-3 py-2 text-card-foreground shadow-[var(--shadow-soft)] ring-1 ring-primary/10 backdrop-blur-md"
        aria-label="서비스 내비게이션"
      >
        <Link
          href="/"
          className="group inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-md text-foreground no-underline transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
          aria-label="ERICA Career Chat 홈으로 이동"
        >
          <span
            className="grid size-10 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-[var(--shadow-soft)] transition-transform group-hover:scale-105"
            aria-hidden="true"
          >
            E
          </span>
          <span className="font-semibold tracking-[-0.02em] text-foreground">ERICA Career Chat</span>
        </Link>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <Separator orientation="vertical" className="h-8" />

          <nav className="flex items-center gap-1" aria-label="주요 페이지">
            {navigationItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Button key={item.href} asChild variant="ghost" size="sm">
                  <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("text-muted-foreground no-underline hover:bg-[var(--secondary)] hover:text-[var(--primary)]", active && "bg-[var(--secondary)] text-[var(--primary)] ring-1 ring-primary/20 hover:bg-[var(--secondary)] hover:text-[var(--primary)]")}>
                    <Icon aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                </Button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[var(--container-max)] gap-5 pb-4 md:pb-0">{children}</main>

      <nav
        className="mx-auto mt-5 grid w-full max-w-[var(--container-max)] grid-cols-3 gap-1 rounded-xl border border-border/80 bg-card/95 p-2 text-card-foreground shadow-[var(--shadow-soft)] ring-1 ring-primary/10 backdrop-blur-md md:hidden"
        aria-label="모바일 주요 페이지"
      >
        {navigationItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Button
              key={item.href}
              asChild
              variant="ghost"
              className={cn("h-14 min-h-11 flex-col gap-1 px-1 text-xs leading-tight text-muted-foreground hover:bg-[var(--secondary)] hover:text-[var(--primary)]", active && "bg-[var(--secondary)] text-[var(--primary)] ring-1 ring-primary/20 hover:bg-[var(--secondary)] hover:text-[var(--primary)]")}
            >
              <Link href={item.href} aria-current={active ? "page" : undefined}>
                <Icon className="size-4" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            </Button>
          );
        })}
      </nav>
    </div>
  );
}
