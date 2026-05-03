import { z } from "zod";

import { ChatRequestSchema, ChatResponseSchema } from "../../../src/chat/chat-contract.js";
import { getChatService } from "../../../lib/service-container.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const safeError = "요청을 처리하지 못했어요. 잠시 후 다시 시도하거나 공식 출처 페이지에서 직접 확인해 주세요.";
const invalidRequestError = "요청 형식이 올바르지 않아요. 입력값을 확인해 주세요.";

export async function POST(request: Request) {
  try {
    const input = ChatRequestSchema.parse(await request.json());
    const response = await getChatService().ask(input);
    return Response.json(ChatResponseSchema.parse(response));
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return Response.json({ error: invalidRequestError }, { status: 400 });
    }
    return Response.json({ error: safeError }, { status: 503 });
  }
}
