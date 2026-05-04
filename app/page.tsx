import Link from "next/link";

import { DisclaimerNotice } from "../components/safety/disclaimer-notice.js";

export default function Home() {
  return (
    <div className="home-page">
      <section className="home-hero card-surface" aria-labelledby="home-title">
        <h1 id="home-title">커리어 상담</h1>
        <p>ERICA의 확인된 커리어 정보를 바탕으로 질문에 답해드려요.</p>
        <p>답변에 참고한 공고와 마감 정보도 함께 확인할 수 있습니다.</p>
        <div className="home-actions" aria-label="주요 이동">
          <Link className="primary-button" href="/consultation">커리어 상담 시작하기</Link>
          <Link className="pill-control" href="/explore">정보 둘러보기</Link>
        </div>
      </section>

      <section className="home-proof-grid" aria-label="서비스 방식">
        <article className="soft-surface home-proof-card">
          <p className="panel-kicker">답변 근거</p>
          <h2>답변에 참고한 정보와 출처를 함께 보여드려요.</h2>
          <p>상담 답변은 확인된 출처와 연결되며, 출처 확인 페이지에서 원문과 수집 맥락을 다시 볼 수 있습니다.</p>
        </article>
        <article className="soft-surface home-proof-card">
          <p className="panel-kicker">마감 확인</p>
          <h2>게시일과 마감 상태를 함께 확인하고, 중요한 조건은 원문에서 다시 확인하도록 안내합니다.</h2>
          <p>게시일·수집일·마감 상태가 있는 정보는 함께 표시하고, 중요한 조건은 원문에서 재확인하도록 안내합니다.</p>
        </article>
      </section>

      <DisclaimerNotice />
    </div>
  );
}
