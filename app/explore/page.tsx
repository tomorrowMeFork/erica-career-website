"use client";

import { useCallback, useEffect, useState } from "react";

import { clearPreferences, fetchRecommendations, readPreferences, savePreferences, updatePreferences } from "../../lib/api-client.js";
import { getOrCreateSessionKey } from "../../lib/session-key.js";
import { ListingPanel } from "../../components/listings/listing-panel.js";
import type { ListingFilter } from "../../components/listings/listing-filter-pills.js";
import type { PreferenceProfile, PreferenceState } from "../../src/personalization/preference-contract.js";
import type { RecommendationItem, RecommendationResponse } from "../../src/recommendations/recommendation-contract.js";

const emptyPreferenceState: PreferenceState = { preference_ranking_enabled: false, profile: null, storage_scope: "none" };

export default function ExplorePage() {
  const [sessionKey, setSessionKey] = useState("phase8-session-pending");
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [recommendationResponse, setRecommendationResponse] = useState<RecommendationResponse | undefined>();
  const [activeFilter, setActiveFilter] = useState<ListingFilter>("전체");
  const [preferenceState, setPreferenceState] = useState<PreferenceState>(emptyPreferenceState);

  const refreshRecommendations = useCallback(async (key: string, profile?: PreferenceProfile, requestQuery?: string) => {
    const result = await fetchRecommendations({ session_key: key, ...(profile !== undefined ? { profile } : {}), ...(requestQuery !== undefined ? { query: requestQuery } : {}), limit: 5 });
    if (result.ok) {
      setRecommendationResponse(result.data);
      setRecommendations(result.data.recommendations);
      return result.data.recommendations;
    }
    return [];
  }, []);

  useEffect(() => {
    const key = getOrCreateSessionKey();
    setSessionKey(key);
    void readPreferences(key).then((result) => { if (result.ok) setPreferenceState(result.data); });
    void refreshRecommendations(key);
  }, [refreshRecommendations]);

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

  void preferenceState;
  void handleSave;
  void handleUpdate;
  void handleClearPreferences;
  void handleRead;

  return (
    <div className="explore-page">
      <header className="route-hero card-surface">
        <p className="eyebrow">Information Explore</p>
        <h1>커리어 정보 탐색</h1>
        <p>수집된 ERICA 커리어 정보를 출처와 마감 상태 중심으로 살펴보세요.</p>
      </header>
      <section className="route-helper soft-surface" aria-label="탐색 안내">
        <h2>Phase 9에서 상세 탐색과 필터가 확장됩니다.</h2>
        <p>필터는 보기 범위를 줄이는 용도이며, 새로운 매칭/순위 산정이 아닙니다. 마감 및 모집 조건은 원문에서 다시 확인해야 합니다.</p>
      </section>
      <ListingPanel
        items={recommendations}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onRefresh={(key) => void refreshRecommendations(key)}
        sessionKey={sessionKey}
        preferenceMode={recommendationResponse?.preference_mode ?? "no_preference"}
        privacyMetadata={recommendationResponse?.privacy_metadata}
      />
    </div>
  );
}
