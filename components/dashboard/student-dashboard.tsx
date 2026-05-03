"use client";

import { useCallback, useEffect, useState } from "react";

import { clearPreferences, fetchRecommendations, readPreferences, savePreferences, sendChatMessage, updatePreferences } from "../../lib/api-client.js";
import { getOrCreateSessionKey } from "../../lib/session-key.js";
import type { ChatCitation, ChatResponse } from "../../src/chat/chat-contract.js";
import type { PreferenceProfile, PreferenceState } from "../../src/personalization/preference-contract.js";
import type { RecommendationItem, RecommendationResponse } from "../../src/recommendations/recommendation-contract.js";
import { ChatComposer } from "../chat/chat-composer.js";
import { ChatMessageList, type DashboardMessage } from "../chat/chat-message-list.js";
import { MobileSourceSheet } from "../citations/mobile-source-sheet.js";
import { SourceInspectionRail } from "../citations/source-inspection-rail.js";
import { ListingPanel } from "../listings/listing-panel.js";
import type { ListingFilter } from "../listings/listing-filter-pills.js";
import { PreferencePanel } from "../preferences/preference-panel.js";
import { SettingsMenu } from "../preferences/settings-menu.js";
import { StorageScopeChip } from "../preferences/storage-scope-chip.js";

const emptyPreferenceState: PreferenceState = { preference_ranking_enabled: false, profile: null, storage_scope: "none" };

export function StudentDashboard() {
  const [sessionKey, setSessionKey] = useState("phase5-session-pending");
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<DashboardMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<ChatCitation | undefined>();
  const [sourceCitations, setSourceCitations] = useState<ChatCitation[]>([]);
  const [sourcePanelOpen, setSourcePanelOpen] = useState(false);
  const [sourceOpener, setSourceOpener] = useState<HTMLElement | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [recommendationResponse, setRecommendationResponse] = useState<RecommendationResponse | undefined>();
  const [preferenceState, setPreferenceState] = useState<PreferenceState>(emptyPreferenceState);
  const [activeFilter, setActiveFilter] = useState<ListingFilter>("전체");
  const [activePanel, setActivePanel] = useState<"chat" | "listings" | "preferences">("chat");

  useEffect(() => {
    const key = getOrCreateSessionKey();
    setSessionKey(key);
    void readPreferences(key).then((result) => { if (result.ok) setPreferenceState(result.data); });
    void refreshRecommendations(key);
  }, []);

  const refreshRecommendations = useCallback(async (key: string, profile?: PreferenceProfile, requestQuery?: string) => {
    const result = await fetchRecommendations({ session_key: key, ...(profile !== undefined ? { profile } : {}), ...(requestQuery !== undefined ? { query: requestQuery } : {}), limit: 5 });
    if (result.ok) {
      setRecommendationResponse(result.data);
      setRecommendations(result.data.recommendations);
      return result.data.recommendations;
    }
    return [];
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
      const fallback: ChatResponse = { answer: chatResult.message, citations: [], refusal_tier: "hard_refuse", confidence: 0, trace_id: "phase5-ui-error" };
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
    <main className="phase5-shell" onKeyDown={(event) => { if (event.key === "Escape") closeSource(); }}>
      <div className="phase5-container">
        <header className="dashboard-header card-surface">
          <div><p>ERICA Career Chat</p><h1>무엇을 도와드릴까요?</h1><p>채용 공고, 마감일, 취업 프로그램을 한국어로 질문하면 확인된 출처를 함께 보여드려요.</p></div>
          <StorageScopeChip storageScope={preferenceState.storage_scope} rankingEnabled={preferenceState.preference_ranking_enabled} />
          <SettingsMenu onClearPreferences={() => void handleClearPreferences()} onClearChatHistory={clearChatHistory} />
        </header>

        <nav className="panel-tabs" aria-label="대시보드 패널">
          <button type="button" className="pill-control" aria-pressed={activePanel === "chat"} onClick={() => setActivePanel("chat")}>채팅</button>
          <button type="button" className="pill-control" aria-pressed={activePanel === "listings"} onClick={() => setActivePanel("listings")}>공고</button>
          <button type="button" className="pill-control" aria-pressed={activePanel === "preferences"} onClick={() => setActivePanel("preferences")}>추천 조건</button>
        </nav>

        <div className="dashboard-grid">
          <aside className={`dashboard-left ${activePanel === "preferences" || activePanel === "listings" ? "is-mobile-open" : ""}`}>
            <div className={`mobile-panel mobile-panel--preferences ${activePanel === "preferences" ? "is-active" : ""}`}>
              <PreferencePanel state={preferenceState} sessionKey={sessionKey} onSet={handleSave} onUpdate={handleUpdate} onClear={handleClearPreferences} onRead={handleRead} />
            </div>
            <div className={`mobile-panel mobile-panel--listings ${activePanel === "listings" ? "is-active" : ""}`}>
              <ListingPanel items={recommendations} activeFilter={activeFilter} onFilterChange={setActiveFilter} onRefresh={(key) => void refreshRecommendations(key)} sessionKey={sessionKey} preferenceMode={recommendationResponse?.preference_mode ?? "no_preference"} privacyMetadata={recommendationResponse?.privacy_metadata} />
            </div>
          </aside>

          <section className="chat-column card-surface" aria-label="채팅">
            <ChatMessageList messages={messages} onOpenCitation={openCitation} />
            {isLoading ? <div className="card-surface loading-card">관련 출처를 확인하고 답변을 준비하고 있어요…</div> : null}
            <ChatComposer query={query} onQueryChange={setQuery} onSubmit={submitQuestion} isLoading={isLoading} />
          </section>

          <div className="source-column">
            {sourcePanelOpen ? <SourceInspectionRail citations={sourceCitations} selectedCitation={selectedCitation} onSelect={handleSelectCitation} onClose={closeSource} /> : <div className="soft-surface source-placeholder">출처 확인하기</div>}
          </div>
        </div>

        <MobileSourceSheet open={sourcePanelOpen} citations={sourceCitations} selectedCitation={selectedCitation} opener={sourceOpener} onClose={closeSource} />
      </div>
    </main>
  );
}
