export default async function SourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);

  return (
    <div className="source-page">
      <section className="route-hero card-surface">
        <p className="eyebrow">Source Verification</p>
        <h1>출처 확인</h1>
        <p>이 정보가 어떤 원문과 근거에서 왔는지 확인하세요.</p>
      </section>
      <section className="source-detail-card soft-surface" aria-label="출처 확인 상세">
        <header>
          <div>
            <p className="panel-kicker">선택된 정보</p>
            <h2>{decodedId}</h2>
          </div>
          <span className="badge badge--warning">동적 원문 조회 준비 중</span>
        </header>

        <div className="source-metadata-grid" aria-label="필수 메타데이터">
          <div className="source-metadata-item card-surface">
            <span>정보 식별자</span>
            <strong>{decodedId}</strong>
          </div>
          <div className="source-metadata-item card-surface">
            <span>source_id</span>
            <strong>원문 조회 후 표시</strong>
          </div>
          <div className="source-metadata-item card-surface">
            <span>chunk_id</span>
            <strong>{decodedId}</strong>
          </div>
          <div className="source-metadata-item card-surface">
            <span>게시일</span>
            <strong>원문 조회 후 표시</strong>
          </div>
          <div className="source-metadata-item card-surface">
            <span>수집일</span>
            <strong>원문 조회 후 표시</strong>
          </div>
          <div className="source-metadata-item card-surface">
            <span>마감 상태</span>
            <strong>원문 조회 후 표시</strong>
          </div>
        </div>

        <div className="source-evidence-note card-surface">
          <p>source_id, chunk_id, 게시일, 수집일, 마감 상태를 함께 확인할 수 있어야 합니다.</p>
          <p>근거가 불충분한 해석은 일반 안내로만 참고하세요.</p>
        </div>

        <div className="source-detail-actions">
          <button type="button" className="primary-button" aria-disabled="true">원문 출처 확인하기</button>
          <a className="pill-control" href="/consultation">상담에서 이 정보로 질문하기</a>
        </div>
      </section>
    </div>
  );
}
