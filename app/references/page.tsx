"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ReferenceCard } from "../../components/references/reference-card.js";
import { readSessionReferences, type SessionReferenceItem } from "../../lib/session-references.js";

export default function ReferencesPage() {
  const [references, setReferences] = useState<SessionReferenceItem[] | null>(null);

  useEffect(() => {
    setReferences(sortReferences(readSessionReferences()));
  }, []);

  return (
    <div className="references-page">
      {references === null ? null : references.length === 0 ? (
        <section className="references-empty card-surface" aria-label="참고한 정보 없음">
          <h2>아직 참고한 정보가 없습니다</h2>
          <p>커리어 상담에서 질문하면 이 탭에서 답변에 참고한 출처와 공고를 확인할 수 있어요.</p>
          <Link className="primary-button" href="/consultation">커리어 상담 시작하기</Link>
        </section>
      ) : (
        <>
          <header className="route-hero card-surface">
            <p className="eyebrow">상담에서 확인한 출처</p>
            <h1>참고한 정보</h1>
            <p>이번 상담에서 답변에 참고된 출처와 공고만 모았어요.</p>
          </header>

          <section className="references-list-panel soft-surface" aria-label="참고한 정보 목록">
            <div className="references-list-grid">
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
