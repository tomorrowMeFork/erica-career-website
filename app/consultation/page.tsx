"use client";

import { useCallback, useEffect, useState } from "react";

import {
  clearPreferences,
  fetchRecommendations,
  readPreferences,
  savePreferences,
  sendChatMessage,
  updatePreferences,
} from "../../lib/api-client.js";
import { getOrCreateSessionKey } from "../../lib/session-key.js";
import { ChatComposer } from "../../components/chat/chat-composer.js";
import {
  ChatMessageList,
  type DashboardMessage,
} from "../../components/chat/chat-message-list.js";
import { MobileSourceSheet } from "../../components/citations/mobile-source-sheet.js";
import { SourceInspectionRail } from "../../components/citations/source-inspection-rail.js";
import { LoadingState } from "../../components/common/loading-state.js";
import { PreferencePanel } from "../../components/preferences/preference-panel.js";
import { SettingsMenu } from "../../components/preferences/settings-menu.js";
import { StorageScopeChip } from "../../components/preferences/storage-scope-chip.js";
import { DisclaimerNotice } from "../../components/safety/disclaimer-notice.js";
import { Button } from "../../components/ui/button.js";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card.js";
import type {
  ChatCitation,
  ChatResponse,
} from "../../src/chat/chat-contract.js";
import type {
  PreferenceProfile,
  PreferenceState,
} from "../../src/personalization/preference-contract.js";
import {
  appendCitations,
  appendRecommendations,
  clearSessionReferences,
} from "../../lib/session-references.js";

const emptyPreferenceState: PreferenceState = {
  preference_ranking_enabled: false,
  profile: null,
  storage_scope: "none",
};

export default function ConsultationPage() {
  const [sessionKey, setSessionKey] = useState("phase8-session-pending");
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<DashboardMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<
    ChatCitation | undefined
  >();
  const [sourceCitations, setSourceCitations] = useState<ChatCitation[]>([]);
  const [sourcePanelOpen, setSourcePanelOpen] = useState(false);
  const [sourceOpener, setSourceOpener] = useState<HTMLElement | null>(null);
  const [preferenceState, setPreferenceState] =
    useState<PreferenceState>(emptyPreferenceState);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [isMobileSourceSheet, setIsMobileSourceSheet] = useState(false);

  const refreshRecommendations = useCallback(
    async (key: string, profile?: PreferenceProfile, requestQuery?: string) => {
      const result = await fetchRecommendations({
        session_key: key,
        ...(profile !== undefined ? { profile } : {}),
        ...(requestQuery !== undefined ? { query: requestQuery } : {}),
        limit: 5,
      });
      if (result.ok) return result.data.recommendations;
      return [];
    },
    [],
  );

  useEffect(() => {
    const key = getOrCreateSessionKey();
    setSessionKey(key);
    void readPreferences(key).then((result) => {
      if (result.ok) setPreferenceState(result.data);
    });
  }, []);

  useEffect(() => {
    const viewportQuery = window.matchMedia("(max-width: 1279px)");
    const syncViewport = () => setIsMobileSourceSheet(viewportQuery.matches);
    syncViewport();
    viewportQuery.addEventListener("change", syncViewport);
    return () => viewportQuery.removeEventListener("change", syncViewport);
  }, []);

  const submitQuestion = useCallback(async () => {
    const trimmed = query.trim();
    if (trimmed.length === 0 || isLoading) return;
    setIsLoading(true);
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: "user", query: trimmed },
    ]);
    setQuery("");
    const chatResult = await sendChatMessage({
      query: trimmed,
      top_k: 5,
      session_key: sessionKey,
    });
    if (chatResult.ok) {
      const answerId = `assistant-${Date.now()}`;
      const attached = await refreshRecommendations(
        sessionKey,
        undefined,
        trimmed,
      );
      if (chatResult.data.citations.length > 0)
        appendCitations(chatResult.data.citations, undefined, trimmed);
      if (attached.length > 0)
        appendRecommendations(attached, undefined, trimmed);
      setMessages((current) => [
        ...current,
        {
          id: answerId,
          role: "assistant",
          response: chatResult.data,
          status: "complete",
          recommendations: attached,
        },
      ]);
    } else {
      const fallback: ChatResponse = {
        answer: chatResult.message,
        citations: [],
        refusal_tier: "hard_refuse",
        confidence: 0,
        trace_id: "phase8-ui-error",
      };
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          response: fallback,
          status: "complete",
          recommendations: [],
        },
      ]);
    }
    setIsLoading(false);
  }, [isLoading, query, refreshRecommendations, sessionKey]);

  const openCitation = useCallback(
    (
      citation: ChatCitation,
      scopedCitations: ChatCitation[],
      opener?: HTMLElement,
    ) => {
      setSelectedCitation(citation);
      setSourceCitations(scopedCitations);
      setSourceOpener(opener ?? null);
      setSourcePanelOpen(true);
    },
    [],
  );

  const closeSource = useCallback(() => {
    setSourcePanelOpen(false);
    sourceOpener?.focus();
  }, [sourceOpener]);

  const handleSave = useCallback(
    async (key: string, profile: PreferenceProfile) => {
      const result = await savePreferences(key, profile);
      if (result.ok) {
        setPreferenceState(result.data);
        await refreshRecommendations(key, profile);
      }
    },
    [refreshRecommendations],
  );

  const handleUpdate = useCallback(
    async (key: string, profile: Partial<PreferenceProfile>) => {
      const result = await updatePreferences(key, profile);
      if (result.ok) {
        setPreferenceState(result.data);
        if (result.data.profile !== null)
          await refreshRecommendations(key, result.data.profile);
      }
    },
    [refreshRecommendations],
  );

  const handleClearPreferences = useCallback(
    async (key = sessionKey) => {
      const result = await clearPreferences(key);
      if (result.ok) {
        setPreferenceState(result.data);
        await refreshRecommendations(key);
      }
    },
    [refreshRecommendations, sessionKey],
  );

  const handleRead = useCallback(async (key: string) => {
    const result = await readPreferences(key);
    if (result.ok) setPreferenceState(result.data);
  }, []);

  const clearChatHistory = useCallback(() => {
    setMessages([]);
    clearSessionReferences();
  }, []);
  const handleSelectCitation = useCallback(
    (citation: ChatCitation) => setSelectedCitation(citation),
    [],
  );
  const preferenceSummary = summarizePreferences(preferenceState.profile);

  return (
    <section
      className="grid gap-6 lg:gap-8"
      onKeyDown={(event) => {
        if (event.key === "Escape") closeSource();
      }}
    >
      <Card
        className="relative overflow-hidden border-primary/20 bg-card/95 shadow-[var(--shadow-brand)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-2 before:bg-[var(--surface-brand-gradient)] after:pointer-events-none after:absolute after:-right-20 after:-top-24 after:size-64 after:rounded-full after:bg-[var(--surface-warm-gradient)] after:opacity-25 after:blur-2xl"
        aria-labelledby="consultationTitle"
      >
        <CardHeader className="relative z-10 gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <div className="grid gap-3">
            <p className="w-fit rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              ERICA Career Chat
            </p>
            <CardTitle>
              <h1
                id="consultationTitle"
                className="text-4xl font-bold tracking-[-0.04em] text-foreground md:text-5xl"
              >
                커리어 상담
              </h1>
            </CardTitle>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground">
              궁금한 점을 물어보세요. ERICA 커리어 정보를 바탕으로 답변드려요.
            </p>
          </div>
          <div
            className="flex flex-wrap items-center gap-2 justify-self-start md:justify-self-end"
            aria-label="상담 개인정보 관리"
          >
            <StorageScopeChip
              storageScope={preferenceState.storage_scope}
              rankingEnabled={preferenceState.preference_ranking_enabled}
            />
            <SettingsMenu
              onClearPreferences={() => void handleClearPreferences()}
              onClearChatHistory={clearChatHistory}
            />
          </div>
        </CardHeader>
      </Card>

      <section
        className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]"
        aria-label="상담 안내와 조건"
      >
        <DisclaimerNotice />

        <Card className="overflow-hidden border-primary/15 bg-card/95 shadow-[var(--shadow-soft)]">
          <CardContent className="grid gap-4 px-5 pt-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="grid gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  상담 조건
                </p>
                <p className="text-base font-medium text-foreground">
                  {preferenceSummary}
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  조건을 입력하면 현재 세션 기준으로 답변과 추천 근거를 더 잘
                  맞출 수 있어요.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-full border-primary/25 bg-background/80 text-primary sm:w-auto"
                aria-expanded={preferencesOpen}
                aria-controls="preferencePanel"
                onClick={() => setPreferencesOpen((open) => !open)}
              >
                {preferencesOpen ? "상담 조건 접기" : "상담 조건 열기"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {preferencesOpen ? (
          <section
            id="preferencePanel"
            className="lg:col-span-2"
            aria-label="상담 조건"
          >
            <PreferencePanel
              state={preferenceState}
              sessionKey={sessionKey}
              onSet={handleSave}
              onUpdate={handleUpdate}
              onClear={handleClearPreferences}
              onRead={handleRead}
            />
          </section>
        ) : null}
      </section>

      <div
        className={
          sourcePanelOpen && !isMobileSourceSheet
            ? "grid min-w-0 gap-5 xl:grid-cols-[minmax(0,calc(100%-var(--desktop-source-rail)-var(--space-5)))_var(--desktop-source-rail)] 2xl:grid-cols-[minmax(0,calc(100%-var(--wide-source-rail)-var(--space-5)))_var(--wide-source-rail)]"
            : "grid min-w-0 gap-5"
        }
      >
        <Card
          className="min-w-0 overflow-hidden border-primary/15 bg-card/95 py-0 shadow-[var(--shadow-card)]"
          aria-label="채팅"
        >
          <CardContent className="grid min-w-0 gap-5 p-4 sm:p-5 lg:p-6">
            <ChatMessageList
              messages={messages}
              onOpenCitation={openCitation}
              onSelectExample={setQuery}
            />
            {isLoading ? (
              <LoadingState
                mode="alert"
                statusText="관련 출처를 확인하고 답변을 준비하고 있어요…"
              />
            ) : null}
            <ChatComposer
              query={query}
              onQueryChange={setQuery}
              onSubmit={submitQuestion}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>

        {sourcePanelOpen && !isMobileSourceSheet ? (
          <aside
            className="hidden min-w-0 xl:block"
            aria-label="답변 출처 패널"
          >
            <SourceInspectionRail
              citations={sourceCitations}
              selectedCitation={selectedCitation}
              onSelect={handleSelectCitation}
              onClose={closeSource}
            />
          </aside>
        ) : null}
      </div>

      <MobileSourceSheet
        open={sourcePanelOpen && isMobileSourceSheet}
        citations={sourceCitations}
        selectedCitation={selectedCitation}
        opener={sourceOpener}
        onClose={closeSource}
      />
    </section>
  );
}

function summarizePreferences(profile: PreferenceProfile | null): string {
  if (profile === null) return "상담 조건 설정";
  const parts = [
    profile.major ? `전공 ${profile.major}` : null,
    profile.target_role ? `직무 ${profile.target_role}` : null,
    profile.industry.length > 0 ? `산업 ${profile.industry[0]}` : null,
    profile.region.length > 0 ? `지역 ${profile.region[0]}` : null,
    profile.employment_type.length > 0
      ? `형태 ${profile.employment_type[0]}`
      : null,
  ].filter((part): part is string => part !== null);
  return parts.length === 0 ? "상담 조건 설정" : parts.slice(0, 2).join(" · ");
}
