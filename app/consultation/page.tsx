"use client";

import { useCallback, useEffect, useState } from "react";

import { clearPreferences, fetchRecommendations, readPreferences, savePreferences, sendChatMessage, updatePreferences } from "../../lib/api-client.js";
import { getOrCreateSessionKey } from "../../lib/session-key.js";
import { ChatComposer } from "../../components/chat/chat-composer.js";
import { ChatMessageList, type DashboardMessage } from "../../components/chat/chat-message-list.js";
import { MobileSourceSheet } from "../../components/citations/mobile-source-sheet.js";
import { SourceInspectionRail } from "../../components/citations/source-inspection-rail.js";
import { PreferencePanel } from "../../components/preferences/preference-panel.js";
import { SettingsMenu } from "../../components/preferences/settings-menu.js";
import { StorageScopeChip } from "../../components/preferences/storage-scope-chip.js";
import { DisclaimerNotice } from "../../components/safety/disclaimer-notice.js";
import type { ChatCitation, ChatResponse } from "../../src/chat/chat-contract.js";
import type { PreferenceProfile, PreferenceState } from "../../src/personalization/preference-contract.js";

const emptyPreferenceState: PreferenceState = { preference_ranking_enabled: false, profile: null, storage_scope: "none" };

export default function ConsultationPage() {
  const [sessionKey, setSessionKey] = useState("phase8-session-pending");
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<DashboardMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<ChatCitation | undefined>();
  const [sourceCitations, setSourceCitations] = useState<ChatCitation[]>([]);
  const [sourcePanelOpen, setSourcePanelOpen] = useState(false);
  const [sourceOpener, setSourceOpener] = useState<HTMLElement | null>(null);
  const [preferenceState, setPreferenceState] = useState<PreferenceState>(emptyPreferenceState);

  const refreshRecommendations = useCallback(async (key: string, profile?: PreferenceProfile, requestQuery?: string) => {
    const result = await fetchRecommendations({ session_key: key, ...(profile !== undefined ? { profile } : {}), ...(requestQuery !== undefined ? { query: requestQuery } : {}), limit: 5 });
    if (result.ok) return result.data.recommendations;
    return [];
  }, []);

  useEffect(() => {
    const key = getOrCreateSessionKey();
    setSessionKey(key);
    void readPreferences(key).then((result) => { if (result.ok) setPreferenceState(result.data); });
  }, []);

  const submitQuestion = useCallback(async () => {
    const trimmed = query.trim();
    if (trimmed.length === 0 || isLoading) return;
    setIsLoading(true);
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", query: trimmed }]);
    setQuery("");
    const chatResult = await sendChatMessage({ query: trimmed, top_k: 5 });
    if (chatResult.ok) {
      const answerId = `assistant-${Date.now()}`;
      const attached = await refreshRecommendations(sessionKey, undefined, trimmed);
      setMessages((current) => [...current, { id: answerId, role: "assistant", response: chatResult.data, status: "complete", recommendations: attached }]);
    } else {
      const fallback: ChatResponse = { answer: chatResult.message, citations: [], refusal_tier: "hard_refuse", confidence: 0, trace_id: "phase8-ui-error" };
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", response: fallback, status: "complete", recommendations: [] }]);
    }
    setIsLoading(false);
  }, [isLoading, query, refreshRecommendations, sessionKey]);

  const openCitation = useCallback((citation: ChatCitation, scopedCitations: ChatCitation[], opener?: HTMLElement) => {
    setSelectedCitation(citation);
    setSourceCitations(scopedCitations);
    setSourceOpener(opener ?? null);
    setSourcePanelOpen(true);
  }, []);

  const closeSource = useCallback(() => {
    setSourcePanelOpen(false);
    sourceOpener?.focus();
  }, [sourceOpener]);

  const handleSave = useCallback(async (key: string, profile: PreferenceProfile) => {
    const result = await savePreferences(key, profile);
    if (result.ok) {
      setPreferenceState(result.data);
      await refreshRecommendations(key, profile);
    }
  }, [refreshRecommendations]);

  const handleUpdate = useCallback(async (key: string, profile: Partial<PreferenceProfile>) => {
    const result = await updatePreferences(key, profile);
    if (result.ok) {
      setPreferenceState(result.data);
      if (result.data.profile !== null) await refreshRecommendations(key, result.data.profile);
    }
  }, [refreshRecommendations]);

  const handleClearPreferences = useCallback(async (key = sessionKey) => {
    const result = await clearPreferences(key);
    if (result.ok) {
      setPreferenceState(result.data);
      await refreshRecommendations(key);
    }
  }, [refreshRecommendations, sessionKey]);

  const handleRead = useCallback(async (key: string) => {
    const result = await readPreferences(key);
    if (result.ok) setPreferenceState(result.data);
  }, []);

  const clearChatHistory = useCallback(() => setMessages([]), []);
  const handleSelectCitation = useCallback((citation: ChatCitation) => setSelectedCitation(citation), []);

  return (
    <div className="consultation-page" onKeyDown={(event) => { if (event.key === "Escape") closeSource(); }}>
      <header className="route-hero consultation-hero card-surface">
        <div>
          <p className="eyebrow">Career Consultation</p>
          <h1>커리어 상담</h1>
          <p>질문을 입력하면 확인된 ERICA 커리어 정보에 근거해 한국어로 답변합니다.</p>
        </div>
        <div className="shell-actions" aria-label="세션 및 설정">
          <StorageScopeChip storageScope={preferenceState.storage_scope} rankingEnabled={preferenceState.preference_ranking_enabled} />
          <SettingsMenu onClearPreferences={() => void handleClearPreferences()} onClearChatHistory={clearChatHistory} />
        </div>
      </header>

      <DisclaimerNotice />

      <div className="consultation-layout">
        <aside className="consultation-preferences" aria-label="상담 조건">
          <PreferencePanel state={preferenceState} sessionKey={sessionKey} onSet={handleSave} onUpdate={handleUpdate} onClear={handleClearPreferences} onRead={handleRead} />
        </aside>

        <section className="chat-column card-surface" aria-label="채팅">
          <ChatMessageList messages={messages} onOpenCitation={openCitation} />
          {isLoading ? <div className="card-surface loading-card">관련 출처를 확인하고 답변을 준비하고 있어요…</div> : null}
          <ChatComposer query={query} onQueryChange={setQuery} onSubmit={submitQuestion} isLoading={isLoading} />
        </section>

        <aside className="consultation-source" aria-label="출처 패널">
          {sourcePanelOpen ? <SourceInspectionRail citations={sourceCitations} selectedCitation={selectedCitation} onSelect={handleSelectCitation} onClose={closeSource} /> : <div className="soft-surface source-placeholder">답변의 인용 번호를 선택하면 출처와 수집 정보를 확인할 수 있어요.</div>}
        </aside>
      </div>

      <MobileSourceSheet open={sourcePanelOpen} citations={sourceCitations} selectedCitation={selectedCitation} opener={sourceOpener} onClose={closeSource} />
    </div>
  );
}
