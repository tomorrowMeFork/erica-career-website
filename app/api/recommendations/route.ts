import { RecommendationRequestSchema, RecommendationResponseSchema } from "../../../src/recommendations/recommendation-contract.js";
import { getRecommendationService } from "../../../lib/service-container.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const safeError = "요청을 처리하지 못했어요. 잠시 후 다시 시도하거나 공식 출처 페이지에서 직접 확인해 주세요.";

export async function GET() {
  return handleRecommendation({ limit: 5 });
}

export async function POST(request: Request) {
  try {
    return handleRecommendation(await request.json());
  } catch (_error) {
    return Response.json({ error: safeError }, { status: 503 });
  }
}

async function handleRecommendation(input: unknown) {
  try {
    const request = RecommendationRequestSchema.parse(input);
    const response = await getRecommendationService().recommend(request);
    return Response.json(RecommendationResponseSchema.parse(response));
  } catch (_error) {
    return Response.json({ error: safeError }, { status: 503 });
  }
}
