export default async function SourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  void id;

  return (
    <div className="source-page">
      <section className="route-hero card-surface">
        <p className="eyebrow">원문 안내</p>
        <h1>출처 상세</h1>
        <p>이 정보의 원문 출처를 확인하세요.</p>
      </section>
      <section className="source-detail-card soft-surface" aria-label="출처 확인 상세">
        <header>
          <div>
            <p className="panel-kicker">상담을 돕는 참고 정보</p>
            <h2>선택한 정보</h2>
          </div>
          <span className="badge badge--warning">원문 확인 필요</span>
        </header>

        <div className="source-metadata-grid" aria-label="필수 메타데이터">
          <div className="source-metadata-item card-surface">
            <span>출처</span>
            <strong>상담 답변의 출처 카드에서 연결된 원문</strong>
          </div>
          <div className="source-metadata-item card-surface">
            <span>게시일</span>
            <strong>원문에서 확인</strong>
          </div>
          <div className="source-metadata-item card-surface">
            <span>확인일</span>
            <strong>상담 답변 기준으로 안내</strong>
          </div>
          <div className="source-metadata-item card-surface">
            <span>마감 상태</span>
            <strong>원문에서 최신 상태 확인</strong>
          </div>
        </div>

        <div className="source-evidence-note card-surface">
          <p>ERICA 공고와 프로그램은 변경될 수 있으니 지원 전 원문에서 일정과 조건을 다시 확인하세요.</p>
          <p>궁금한 점은 상담에서 이어서 질문하면 답변과 함께 관련 출처를 다시 확인할 수 있어요.</p>
        </div>

        <div className="source-detail-actions">
          <a className="primary-button" href="/consultation">이 정보에 대해 질문하기</a>
          <a className="pill-control" href="/explore">정보 더 둘러보기</a>
        </div>
      </section>
    </div>
  );
}
