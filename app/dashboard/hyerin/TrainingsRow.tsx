"use client";

import { useState } from "react";
import type { HyerinTrainingCard } from "@/lib/dashboard-api";

const FOLDERS = [
  "기술훈련",
  "사고훈련",
  "음성일지",
  "작품작업_에샤",
  "작품작업_리스트",
] as const;

const LABELS: Record<string, string> = {
  기술훈련: "기술훈련",
  사고훈련: "사고훈련",
  음성일지: "음성일지",
  작품작업_에샤: "에샤",
  작품작업_리스트: "리스트",
};

interface Props {
  한줄평: Record<string, string>;
  date: string;
}

export default function TrainingsRow({ 한줄평, date }: Props) {
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [cardsByFolder, setCardsByFolder] = useState<
    Record<string, HyerinTrainingCard[]>
  >({});
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(folder: string) {
    if (openFolder === folder) {
      setOpenFolder(null);
      return;
    }
    if (!cardsByFolder[folder]) {
      setLoading(folder);
      setError(null);
      try {
        const url = `/api/dashboard/proxy/hyerin/training/${encodeURIComponent(folder)}/${date}`;
        const r = await fetch(url, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as { cards: HyerinTrainingCard[] };
        setCardsByFolder((prev) => ({ ...prev, [folder]: data.cards }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "fetch 실패");
        setLoading(null);
        return;
      } finally {
        setLoading(null);
      }
    }
    setOpenFolder(folder);
  }

  return (
    <section className="trainings-section">
      <h3 className="section-title">어제의 훈련</h3>
      <div className="trainings-grid">
        {FOLDERS.map((folder) => {
          const line = 한줄평[folder] ?? "안 함";
          const isEmpty = line === "안 함";
          const isOpen = openFolder === folder;
          return (
            <div
              key={folder}
              className={`training-card ${isEmpty ? "empty" : "done"} ${isOpen ? "open" : ""}`}
            >
              <div className="training-head">
                <span className="training-name">{LABELS[folder]}</span>
                {!isEmpty && (
                  <span className="check" aria-label="완료">
                    ✓
                  </span>
                )}
              </div>
              <div className="training-line">{line}</div>
              {!isEmpty && (
                <button
                  type="button"
                  className="detail-btn"
                  onClick={() => toggle(folder)}
                  disabled={loading === folder}
                >
                  {loading === folder
                    ? "불러오는 중..."
                    : isOpen
                      ? "접기 ▴"
                      : "자세히 ▾"}
                </button>
              )}
              {isOpen && (
                <div className="training-detail">
                  {error && openFolder === folder && (
                    <div className="detail-error">에러: {error}</div>
                  )}
                  {(cardsByFolder[folder] ?? []).map((c) => (
                    <div key={c.filename} className="detail-card">
                      <div className="detail-filename">{c.filename}</div>
                      <pre className="detail-content">{c.content}</pre>
                    </div>
                  ))}
                  {(cardsByFolder[folder] ?? []).length === 0 && !error && (
                    <div className="detail-empty">카드 없음</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
