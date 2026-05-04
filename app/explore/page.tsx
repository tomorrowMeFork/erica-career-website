"use client";

import { useCallback, useEffect, useState } from "react";

import { clearPreferences, fetchRecommendations, readPreferences, savePreferences, updatePreferences } from "../../lib/api-client.js";
import { getOrCreateSessionKey } from "../../lib/session-key.js";
import { InfoFilterPills, type InfoFilter } from "../../components/explore/info-filter-pills.js";
import { InfoItemCard } from "../../components/explore/info-item-card.js";
import type { PreferenceProfile, PreferenceState } from "../../src/personalization/preference-contract.js";
import type { RecommendationItem, RecommendationResponse } from "../../src/recommendations/recommendation-contract.js";

const emptyPreferenceState: PreferenceState = { preference_ranking_enabled: false, profile: null, storage_scope: "none" };

export default function ExplorePage() {
  const [sessionKey, setSessionKey] = useState("phase8-session-pending");
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [recommendationResponse, setRecommendationResponse] = useState<RecommendationResponse | undefined>();
  const [activeFilter, setActiveFilter] = useState<InfoFilter>("전체");
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

  const visibleItems = filterInformationItems(recommendations, activeFilter);

  void preferenceState;
  void recommendationResponse;
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
        <p>필터는 보기 범위를 줄이는 용도이며, 새로운 매칭/순위 산정이 아닙니다.</p>
      </header>
      <section className="route-helper soft-surface" aria-label="탐색 안내">
        <h2>정보 탐색하기</h2>
        <p>마감 및 모집 조건은 원문에서 다시 확인해야 합니다. 아래 목록은 수집된 정보의 출처, 게시일, 수집일, 마감 상태를 빠르게 살펴보는 용도입니다.</p>
      </section>
      <section className="info-list-panel soft-surface" aria-label="커리어 정보 목록">
        <header>
          <div>
            <p className="panel-kicker">Collected Information</p>
            <h2>수집 정보</h2>
          </div>
          <button type="button" className="pill-control" onClick={() => void refreshRecommendations(sessionKey)}>새로고침</button>
        </header>
        <InfoFilterPills activeFilter={activeFilter} onChange={setActiveFilter} />
        <p className="info-list-panel__note">source_id, 게시일, 수집일, 마감 상태를 기준으로 정보를 확인하세요.</p>
        {visibleItems.length === 0 ? (
          <div className="info-empty-state card-surface">
            <h3>조건에 맞는 정보가 없습니다.</h3>
            <p>조건을 줄이거나 상담에서 질문해 보세요.</p>
          </div>
        ) : (
          <div className="info-list-grid">
            {visibleItems.map((item) => <InfoItemCard key={item.recommendation_id} item={item} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function filterInformationItems(items: RecommendationItem[], filter: InfoFilter): RecommendationItem[] {
  if (filter === "마감 임박") return [...items].filter((item) => item.deadline_status === "active").sort(compareNewest);
  if (filter === "최신순") return [...items].sort(compareNewest);
  if (filter === "출처별") return [...items].sort((a, b) => a.source_id.localeCompare(b.source_id, "ko") || a.title.localeCompare(b.title, "ko"));
  if (filter === "상태별") return [...items].sort((a, b) => statusRank(a) - statusRank(b) || compareNewest(a, b));
  return items;
}

function compareNewest(a: RecommendationItem, b: RecommendationItem): number {
  return compareNullableDateDescending(a.posted_at, b.posted_at) || compareNullableDateDescending(a.fetched_at, b.fetched_at);
}

function compareNullableDateDescending(left: string | null, right: string | null): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return Date.parse(right) - Date.parse(left);
}

function statusRank(item: RecommendationItem): number {
  if (item.deadline_status === "active") return 0;
  if (item.deadline_status === "unknown") return 1;
  return 2;
}
