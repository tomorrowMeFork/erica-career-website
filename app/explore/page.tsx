"use client";

import { useCallback, useEffect, useState } from "react";

import { clearPreferences, fetchRecommendations, readPreferences, savePreferences, updatePreferences } from "../../lib/api-client.js";
import { getOrCreateSessionKey } from "../../lib/session-key.js";
import { getSourceDisplayLabel } from "../../components/citations/source-card.js";
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
        <p className="eyebrow">ERICA 커리어 정보</p>
        <h1>정보 둘러보기</h1>
        <p>ERICA 공고와 프로그램을 한눈에 살펴볼 수 있어요. 필요하면 원문도 바로 확인할 수 있습니다.</p>
      </header>
      <section className="route-helper soft-surface" aria-label="탐색 안내">
        <h2>상담 전에 가볍게 살펴보기</h2>
        <p>관심 있는 공고나 프로그램을 찾았다면 상담에서 바로 질문해 보세요. 마감일과 모집 조건은 원문 기준으로 다시 확인하는 것이 좋습니다.</p>
      </section>
      <section className="info-list-panel soft-surface" aria-label="커리어 정보 목록">
        <header>
          <div>
            <p className="panel-kicker">보조 정보</p>
            <h2>공고와 프로그램</h2>
          </div>
          <button type="button" className="pill-control" onClick={() => void refreshRecommendations(sessionKey)}>새로고침</button>
        </header>
        <InfoFilterPills activeFilter={activeFilter} onChange={setActiveFilter} />
        <p className="info-list-panel__note">목록은 상담을 돕기 위한 참고 정보입니다. 자세한 조건은 각 원문에서 확인하세요.</p>
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
  if (filter === "진행 중") return [...items].filter((item) => item.deadline_status === "active").sort(compareNewest);
  if (filter === "최근 게시") return [...items].sort(compareNewest);
  if (filter === "출처") return [...items].sort((a, b) => getSourceDisplayLabel("", a.url).localeCompare(getSourceDisplayLabel("", b.url), "ko") || a.title.localeCompare(b.title, "ko"));
  if (filter === "마감 상태") return [...items].sort((a, b) => statusRank(a) - statusRank(b) || compareNewest(a, b));
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
