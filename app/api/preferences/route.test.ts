import { afterEach, describe, expect, it } from "vitest";

import { resetServiceContainerForTest } from "../../../lib/service-container.js";
import { DELETE, GET, PATCH, POST } from "./route.js";

describe("/api/preferences", () => {
  afterEach(() => resetServiceContainerForTest());

  it("supports session-first read, set, update, and clear", async () => {
    const sessionKey = "session-a";
    const profile = { major: "컴퓨터학부", target_role: "백엔드 개발자" };

    const setResponse = await POST(new Request("https://app.test/api/preferences", { method: "POST", body: JSON.stringify({ session_key: sessionKey, profile }) }));
    expect(await setResponse.json()).toMatchObject({ preference_ranking_enabled: true, storage_scope: "session", profile });

    const updateResponse = await PATCH(new Request("https://app.test/api/preferences", { method: "PATCH", body: JSON.stringify({ session_key: sessionKey, profile: { region: ["서울"] } }) }));
    expect(await updateResponse.json()).toMatchObject({ profile: { region: ["서울"] } });

    const readResponse = await GET(new Request(`https://app.test/api/preferences?session_key=${sessionKey}`));
    expect(await readResponse.json()).toMatchObject({ preference_ranking_enabled: true });

    const clearResponse = await DELETE(new Request(`https://app.test/api/preferences?session_key=${sessionKey}`));
    expect(await clearResponse.json()).toMatchObject({ preference_ranking_enabled: false, profile: null, storage_scope: "none" });
  });
});
