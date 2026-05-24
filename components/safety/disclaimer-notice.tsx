export function DisclaimerNotice() {
  return (
    <section className="erica-surface relative grid gap-3 overflow-hidden border-warning/35 p-5 text-warning-foreground ring-1 ring-warning/20 before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-[var(--surface-warm-gradient)]" aria-label="안전 안내">
      <p className="relative text-xs font-semibold uppercase tracking-[0.18em]">참고용 안내</p>
      <h2 className="relative text-lg font-semibold tracking-tight text-foreground">답변은 취업 정보 확인을 돕는 참고용입니다.</h2>
      <p className="relative text-sm leading-6">
        ERICA Career Chat의 답변은 수집된 출처를 바탕으로 한 정보 안내이며, 지원 자격·마감일·신청 방법·장소처럼
        중요한 내용은 반드시 각 카드의 공식 출처 페이지에서 확인해 주세요.
      </p>
      <p className="relative text-sm leading-6">
        공식 한양대학교 인증 서비스가 아님을 알려드리며, 특정 채용 합격이나 취업 결과를 보장하지 않습니다.
      </p>
    </section>
  );
}
