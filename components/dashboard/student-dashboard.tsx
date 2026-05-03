"use client";

export function StudentDashboard() {
  return (
    <main className="phase5-shell">
      <div className="phase5-container">
        <section className="card-surface" style={{ padding: "32px" }} aria-labelledby="dashboard-title">
          <p className="pill-control" style={{ display: "inline-flex", alignItems: "center", padding: "0 16px", background: "var(--surface)", color: "var(--text-secondary)" }}>
            현재 세션에만 저장
          </p>
          <h1 id="dashboard-title" style={{ fontSize: "28px", lineHeight: 1.25, fontWeight: 600, margin: "24px 0 8px" }}>
            무엇을 도와드릴까요?
          </h1>
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>
            채용 공고, 마감일, 취업 프로그램을 한국어로 질문하면 확인된 출처를 함께 보여드려요.
          </p>
        </section>
      </div>
    </main>
  );
}
