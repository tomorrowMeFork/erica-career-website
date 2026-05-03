import { ChatRequestSchema, ChatResponseSchema } from "../../../src/chat/chat-contract.js";
import { getChatService } from "../../../lib/service-container.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const safeError = "요청을 처리하지 못했어요. 잠시 후 다시 시도하거나 공식 출처 페이지에서 직접 확인해 주세요.";

export async function POST(request: Request) {
  try {
    const input = ChatRequestSchema.parse(await request.json());
    const response = await getChatService().ask(input);
    return Response.json(ChatResponseSchema.parse(response));
  } catch (_error) {
    return Response.json({ error: safeError }, { status: 503 });
  }
}
