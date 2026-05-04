import Link from "next/link";

import { DisclaimerNotice } from "../components/safety/disclaimer-notice.js";

export default function Home() {
  return (
    <div className="home-page">
      <section className="home-hero card-surface" aria-labelledby="home-title">
        <p className="eyebrow">출처 기반 ERICA 커리어 상담</p>
        <h1 id="home-title">ERICA 취업 정보를 출처와 함께 확인하고, 근거가 있는 범위에서 커리어 질문을 상담하세요.</h1>
        <p>
          답변에는 출처, 수집일, 게시일, 마감 상태가 함께 표시됩니다. 근거가 부족하거나 오래된 정보만 있으면 답변을 제한하고,
          최종 확인은 원문 출처에서 하도록 안내합니다.
        </p>
        <div className="home-actions" aria-label="주요 이동">
          <Link className="primary-button" href="/consultation">커리어 상담 시작하기</Link>
          <Link className="pill-control" href="/explore">커리어 정보 둘러보기</Link>
        </div>
      </section>

      <section className="home-proof-grid" aria-label="서비스 방식">
        <article className="soft-surface home-proof-card">
          <p className="panel-kicker">Evidence</p>
          <h2>답변 근거를 먼저 보여줍니다.</h2>
          <p>상담 답변은 확인된 출처와 연결되며, 출처 확인 페이지에서 원문과 수집 맥락을 다시 볼 수 있습니다.</p>
        </article>
        <article className="soft-surface home-proof-card">
          <p className="panel-kicker">Freshness</p>
          <h2>마감과 최신성은 별도로 확인합니다.</h2>
          <p>게시일·수집일·마감 상태가 있는 정보는 함께 표시하고, 중요한 조건은 원문에서 재확인하도록 안내합니다.</p>
        </article>
      </section>

      <DisclaimerNotice />
    </div>
  );
}
