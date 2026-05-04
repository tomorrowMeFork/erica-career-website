"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navigationItems = [
  { label: "커리어 상담", href: "/consultation", icon: "✦" },
  { label: "참고한 정보", href: "/references", icon: "◫" },
  { label: "설정", href: "/settings", icon: "⚙" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <header className="shell-header shell-container" aria-label="서비스 내비게이션">
        <Link href="/" className="shell-brand" aria-label="ERICA Career Chat 홈으로 이동">
          <span className="shell-brand__mark" aria-hidden="true">E</span>
          <span>ERICA Career Chat</span>
        </Link>
        <nav className="shell-nav" aria-label="주요 페이지">
          {navigationItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className="shell-nav__link" aria-current={active ? "page" : undefined}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="page-content shell-container">{children}</main>
      <nav className="shell-mobile-nav" aria-label="모바일 주요 페이지">
        {navigationItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className="shell-mobile-nav__link" aria-current={active ? "page" : undefined}>
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
