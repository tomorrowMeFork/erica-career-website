"use client";

export function ChatComposer({ query, onQueryChange, onSubmit, isLoading, maxLength = 2000 }: { query: string; onQueryChange: (query: string) => void; onSubmit: () => void; isLoading: boolean; maxLength?: number }) {
  const disabled = isLoading || query.trim().length === 0;
  return (
    <form className="chat-composer sticky-composer" onSubmit={(event) => { event.preventDefault(); if (!disabled) onSubmit(); }}>
      <textarea aria-label="질문 입력" value={query} maxLength={maxLength} onChange={(event) => onQueryChange(event.target.value)} onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !disabled) onSubmit();
      }} placeholder="채용 공고, 마감일, 취업 프로그램을 질문해 보세요" />
      {isLoading ? <p>관련 출처를 확인하고 답변을 준비하고 있어요…</p> : null}
      <button type="submit" className="pill-control primary-button" disabled={disabled}>질문 보내기</button>
    </form>
  );
}
