import Link from "next/link";

import { MetadataList } from "../../../components/common/metadata-list.js";
import { RouteHero } from "../../../components/common/route-hero.js";
import { StatusBadge } from "../../../components/common/status-badge.js";
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert.js";
import { Badge } from "../../../components/ui/badge.js";
import { Button } from "../../../components/ui/button.js";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../components/ui/card.js";

export default async function SourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  void id;

  return (
    <div className="grid gap-6 md:gap-8">
      <RouteHero
        eyebrow="원문 안내"
        title="출처 상세"
        description="상담 답변에서 연결된 출처를 원문 기준으로 다시 확인할 수 있도록 안내합니다. 현재 화면은 실시간 원문 조회가 아닌 확인 절차용 자리입니다."
        titleId="source-detail-title"
        actions={
          <Badge variant="outline" className="min-h-7 border-warning/60 bg-warning/20 px-3 text-sm text-warning-foreground">원문 확인 필요</Badge>
        }
      />

      <Card aria-label="출처 확인 상세" className="border-0 bg-card/80 shadow-none ring-1 ring-border/20">
        <CardHeader className="gap-4 pb-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <div className="grid gap-3">
            <Badge variant="outline" className="min-h-7 border-accent/50 bg-accent/15 px-3 text-sm text-accent-foreground">상담을 돕는 참고 정보</Badge>
            <CardTitle className="text-2xl leading-tight tracking-tight text-foreground">
              <h2>선택한 정보</h2>
            </CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-6">
              공고와 프로그램은 변경될 수 있으니 아래 항목을 원문 기준으로 살핀 뒤 지원 여부를 판단해 주세요.
            </CardDescription>
          </div>
          <StatusBadge kind="deadline" status="unknown" />
        </CardHeader>

        <CardContent className="grid gap-5">
          <MetadataList
            className="bg-transparent"
            aria-label="필수 메타데이터"
            rows={[
              { label: "출처", value: "상담 답변의 출처 카드에서 연결된 원문" },
              { label: "게시일", value: "원문에서 확인" },
              { label: "확인일", value: "상담 답변 기준으로 안내" },
              { label: "마감 상태", value: <StatusBadge kind="deadline" status="unknown" /> },
            ]}
          />

          <Alert className="border-warning/60 bg-warning/10 text-warning-foreground">
            <AlertTitle>원문 확인 필요</AlertTitle>
            <AlertDescription>
              <p>이 정보의 원문 출처를 확인하세요.</p>
              <p>ERICA 공고와 프로그램은 변경될 수 있으니 지원 전 원문에서 일정과 조건을 다시 확인하세요.</p>
              <p>궁금한 점은 상담에서 이어서 질문하면 답변과 함께 관련 출처를 다시 확인할 수 있어요.</p>
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex-wrap gap-2 pt-0">
          <Button asChild className="rounded-full">
            <Link href="/consultation">커리어 상담으로 돌아가기</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
