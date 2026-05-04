import type { Metadata } from "next";

import { AppShell } from "../components/shell/app-shell.js";
import "./globals.css";

export const metadata: Metadata = {
  title: "ERICA Career Chat",
  description: "한양대 ERICA 취업 정보를 출처와 함께 확인하는 한국어 커리어 챗",
};

const fontClass = "font-readable-sans";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={fontClass}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
