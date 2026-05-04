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
      <section className="source-detail-placeholder soft-surface" aria-label="출처 상세 자리 표시자">
        <p className="panel-kicker">선택된 정보</p>
        <h2>{decodedId}</h2>
        <p>Phase 9에서 원문 출처, source_id, chunk_id, 게시일, 수집일, 마감 상태와 인용 근거를 이 영역에 표시합니다.</p>
        <p>근거가 불충분한 해석은 일반 안내로만 참고해 주세요.</p>
      </section>
    </div>
  );
}
