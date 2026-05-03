import { z } from "zod";

import { PreferenceProfileSchema, PreferenceStateSchema } from "../../../src/personalization/preference-contract.js";
import { getPreferenceService } from "../../../lib/service-container.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const safeError = "요청을 처리하지 못했어요. 잠시 후 다시 시도하거나 공식 출처 페이지에서 직접 확인해 주세요.";
const SessionKeySchema = z.string().trim().min(1).max(120);

export async function GET(request: Request) {
  try {
    const sessionKey = SessionKeySchema.parse(new URL(request.url).searchParams.get("session_key"));
    const state = await getPreferenceService().readState(sessionKey);
    return Response.json(PreferenceStateSchema.parse(state));
  } catch (_error) {
    return Response.json({ error: safeError }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sessionKey = SessionKeySchema.parse(body.session_key);
    const profile = PreferenceProfileSchema.parse(body.profile ?? body);
    const state = await getPreferenceService().setPreferences(sessionKey, profile);
    return Response.json(PreferenceStateSchema.parse(state));
  } catch (_error) {
    return Response.json({ error: safeError }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const sessionKey = SessionKeySchema.parse(body.session_key);
    const state = await getPreferenceService().updatePreferences(sessionKey, body.profile ?? body.update ?? body);
    return Response.json(PreferenceStateSchema.parse(state));
  } catch (_error) {
    return Response.json({ error: safeError }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const sessionKey = SessionKeySchema.parse(new URL(request.url).searchParams.get("session_key"));
    const state = await getPreferenceService().clearPreferences(sessionKey);
    return Response.json(PreferenceStateSchema.parse(state));
  } catch (_error) {
    return Response.json({ error: safeError }, { status: 400 });
  }
}
