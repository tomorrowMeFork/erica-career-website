import Link from "next/link";

import { RouteHero } from "../components/common/route-hero.js";
import { DisclaimerNotice } from "../components/safety/disclaimer-notice.js";
import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import { CardContent } from "../components/ui/card.js";

export default function Home() {
  return (
    <div className="grid gap-6 md:gap-8">
      <RouteHero
        eyebrow="ERICA 커리어 안내"
        title="커리어 상담"
        description={
          <>
            ERICA의 확인된 커리어 정보를 바탕으로 질문에 답해드려요.
            <br />
            답변에 참고한 공고와 마감 정보도 함께 확인할 수 있습니다.
          </>
        }
        titleId="homeTitle"
        actions={
          <Button asChild size="lg" className="min-h-12 rounded-full bg-[var(--primary)] px-7 text-base text-[var(--primary-foreground)] shadow-[0_18px_40px_color-mix(in_oklch,var(--hanyang-blue),transparent_72%)] hover:bg-[var(--hanyang-blue-deep)] md:min-w-56">
            <Link href="/consultation">커리어 상담 시작하기</Link>
          </Button>
        }
      >
        <CardContent className="grid gap-4 border-t border-border/80 bg-secondary/35 py-5 text-sm leading-6 text-muted-foreground md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <p>출처가 남는 답변 흐름으로 상담 내용을 다시 확인할 수 있게 구성했어요.</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-accent/50 bg-accent/15 text-accent-foreground">출처 기반</Badge>
            <Badge variant="outline" className="border-primary/20 bg-card text-primary">마감 재확인</Badge>
          </div>
        </CardContent>
      </RouteHero>

      <section className="grid gap-4 md:grid-cols-2" aria-label="서비스 방식">
        <article className="relative grid gap-4 overflow-hidden rounded-xl border border-accent/35 bg-card/95 p-5 shadow-[var(--shadow-soft)] transition-colors before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-[var(--surface-accent-gradient)] hover:border-accent/55 md:p-6">
          <div className="relative grid gap-3">
            <Badge variant="outline" className="border-accent/50 bg-accent/15 text-accent-foreground">답변 근거</Badge>
            <h2 className="text-xl font-semibold leading-tight tracking-tight text-foreground">답변에 참고한 정보와 출처를 함께 보여드려요.</h2>
            <p className="text-sm leading-6 text-muted-foreground">답변에 활용한 공고와 원문을 함께 확인할 수 있어요.</p>
          </div>
          <div className="relative grid gap-3 text-sm leading-6 text-muted-foreground">
            <p className="border-l-2 border-accent/60 pl-4 text-secondary-foreground">상담 답변 아래에서 참고한 출처 카드와 원문 이동 경로를 확인합니다.</p>
          </div>
        </article>

        <article className="relative grid gap-4 overflow-hidden rounded-xl border border-warning/35 bg-card/95 p-5 shadow-[var(--shadow-soft)] transition-colors before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-[var(--surface-warm-gradient)] hover:border-warning/55 md:p-6">
          <div className="relative grid gap-3">
            <Badge variant="outline" className="border-warning/60 bg-warning/20 text-warning-foreground">마감 확인</Badge>
            <h2 className="text-xl font-semibold leading-tight tracking-tight text-foreground">게시일과 마감 상태를 함께 확인하고, 중요한 조건은 원문에서 다시 확인하도록 안내합니다.</h2>
            <p className="text-sm leading-6 text-muted-foreground">마감일과 모집 조건은 원문 기준으로 다시 확인하도록 안내합니다.</p>
          </div>
          <div className="relative grid gap-3 text-sm leading-6 text-muted-foreground">
            <p className="border-l-2 border-warning/70 pl-4 text-secondary-foreground">공고 일정은 바뀔 수 있으므로 지원 전 최신 상태를 확인하도록 돕습니다.</p>
          </div>
        </article>
      </section>

      <DisclaimerNotice />
    </div>
  );
}
