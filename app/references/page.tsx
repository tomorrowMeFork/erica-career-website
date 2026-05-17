"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EmptyState } from "../../components/common/empty-state.js";
import { RouteHero } from "../../components/common/route-hero.js";
import { ReferenceCard } from "../../components/references/reference-card.js";
import { Button } from "../../components/ui/button.js";
import { CardTitle } from "../../components/ui/card.js";
import { readSessionReferences, type SessionReferenceItem } from "../../lib/session-references.js";

export default function ReferencesPage() {
  const [references, setReferences] = useState<SessionReferenceItem[] | null>(null);

  useEffect(() => {
    setReferences(sortReferences(readSessionReferences()));
  }, []);

  return (
    <div className="grid gap-5">
      {references === null ? null : references.length === 0 ? (
        <EmptyState
          aria-label="참고한 정보 없음"
          className="mx-auto max-w-3xl"
          title={<h2>아직 참고한 정보가 없습니다</h2>}
          body="커리어 상담에서 질문하면 이 탭에서 답변에 참고한 출처와 공고를 확인할 수 있어요."
          action={(
            <Button asChild>
              <Link href="/consultation">커리어 상담 시작하기</Link>
            </Button>
          )}
        />
      ) : (
        <>
          <RouteHero
            eyebrow="상담에서 확인한 출처"
            title="참고한 정보"
            description="이번 상담에서 답변에 참고된 출처와 공고만 모았어요."
            titleId="references-title"
          />

          <section className="grid gap-5" aria-label="참고한 정보 목록">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="grid gap-2">
                <CardTitle className="text-2xl tracking-tight text-foreground">
                  <h2>상담 출처 기록</h2>
                </CardTitle>
                <p className="text-sm leading-6 text-muted-foreground">최근 상담에서 확인한 순서대로 정리했어요.</p>
              </div>
              <p className="rounded-full bg-secondary px-3 py-1 text-sm font-medium text-muted-foreground">
                {references.length}개 출처
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {references.map((item) => <ReferenceCard key={item.url} item={item} />)}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function sortReferences(items: SessionReferenceItem[]): SessionReferenceItem[] {
  return [...items].sort((left, right) => {
    const dateOrder = Date.parse(right.lastReferencedAt) - Date.parse(left.lastReferencedAt);
    return dateOrder || left.title.localeCompare(right.title, "ko");
  });
}
