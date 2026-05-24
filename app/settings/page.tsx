"use client";

import { useCallback, useEffect, useState } from "react";

import { RouteHero } from "../../components/common/route-hero.js";
import {
  clearPreferences,
  readPreferences,
  savePreferences,
  updatePreferences,
} from "../../lib/api-client.js";
import { getOrCreateSessionKey } from "../../lib/session-key.js";
import { PreferencePanel } from "../../components/preferences/preference-panel.js";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "../../components/ui/alert.js";
import { Badge } from "../../components/ui/badge.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card.js";
import type {
  PreferenceProfile,
  PreferenceState,
} from "../../src/personalization/preference-contract.js";

const emptyPreferenceState: PreferenceState = {
  preference_ranking_enabled: false,
  profile: null,
  storage_scope: "none",
};

export default function SettingsPage() {
  const [sessionKey, setSessionKey] = useState("settings-session-pending");
  const [preferenceState, setPreferenceState] =
    useState<PreferenceState>(emptyPreferenceState);

  useEffect(() => {
    const key = getOrCreateSessionKey();
    setSessionKey(key);
    void readPreferences(key).then((result) => {
      if (result.ok) setPreferenceState(result.data);
    });
  }, []);

  const handleSave = useCallback(
    async (key: string, profile: PreferenceProfile) => {
      const result = await savePreferences(key, profile);
      if (result.ok) setPreferenceState(result.data);
    },
    [],
  );

  const handleUpdate = useCallback(
    async (key: string, profile: Partial<PreferenceProfile>) => {
      const result = await updatePreferences(key, profile);
      if (result.ok) setPreferenceState(result.data);
    },
    [],
  );

  const handleClear = useCallback(async (key: string) => {
    const result = await clearPreferences(key);
    if (result.ok) setPreferenceState(result.data);
  }, []);

  const handleRead = useCallback(async (key: string) => {
    const result = await readPreferences(key);
    if (result.ok) setPreferenceState(result.data);
  }, []);

  return (
    <section className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-6 sm:px-6 lg:px-0">
      <RouteHero
        eyebrow="개인화 범위"
        title="설정"
        description="상담 조건과 저장 범위를 관리할 수 있어요."
        titleId="settings-title"
      />

      <section
        className="grid gap-5 lg:grid-cols-[minmax(280px,0.75fr)_minmax(0,1.55fr)] lg:items-start [&_button]:!min-h-11 [&_input]:!min-h-11 [&_textarea]:!min-h-24"
        aria-label="상담 조건과 저장 범위"
      >
        <Card className="erica-surface border-border/35">
          <CardHeader className="gap-4 pb-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">실제 제공 기능</Badge>
            </div>
            <div className="grid gap-2">
              <CardTitle>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  실제 제공 기능
                </h2>
              </CardTitle>
              <CardDescription className="text-base leading-7 text-muted-foreground">
                입력한 조건은 현재 세션 기준 추천 순서에만 사용돼요. 필요하면
                언제든 지울 수 있습니다.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Alert className="border-primary/20 bg-primary/5 text-foreground">
              <AlertTitle>저장 범위 안내</AlertTitle>
              <AlertDescription>
                <p>
                  계정 설정이나 장기 프로필을 만들지 않고, 현재 세션의 추천 순서
                  조정에 필요한 조건만 다룹니다.
                </p>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <PreferencePanel
          state={preferenceState}
          sessionKey={sessionKey}
          onSet={handleSave}
          onUpdate={handleUpdate}
          onClear={handleClear}
          onRead={handleRead}
        />
      </section>
    </section>
  );
}
