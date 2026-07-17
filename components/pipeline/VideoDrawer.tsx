"use client";

import { useEffect } from "react";
import type { StageId, StageStatus, Video } from "@/lib/pipeline/types";
import { PLATFORMS, STAGES } from "@/lib/pipeline/stages";
import { dDay } from "@/lib/pipeline/dday";
import type { Platform } from "@/lib/pipeline/types";
import { StatusDot } from "./StatusDot";
import { PlatformPill } from "./PlatformPill";
import { DDayBadge } from "./DDayBadge";
import { StatusChips } from "./StatusChips";
import styles from "./pipeline.module.css";

interface VideoDrawerProps {
  video: Video;
  today: Date;
  onPatch: (patch: Partial<Omit<Video, "id">>) => void;
  onSetStage: (
    stageId: StageId,
    patch: Partial<{ status: StageStatus; note: string; link: string }>,
  ) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function VideoDrawer({
  video,
  today,
  onPatch,
  onSetStage,
  onDelete,
  onClose,
}: VideoDrawerProps) {
  // ESC 로 닫기
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className={styles.overlay} onClick={onClose} aria-hidden />
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label={`${video.title} 상세`}
      >
        <div className={styles.drawerHead}>
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <PlatformPill platform={video.platform} />
              <DDayBadge info={dDay(video.targetDate, today)} />
            </div>
            <strong style={{ fontSize: "1.05rem", fontWeight: 600 }}>
              {video.title}
            </strong>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className={styles.drawerBody}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="d-title">
              제목
            </label>
            <input
              id="d-title"
              className={styles.input}
              value={video.title}
              onChange={(e) => onPatch({ title: e.target.value })}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="d-platform">
              플랫폼
            </label>
            <select
              id="d-platform"
              className={styles.select}
              value={video.platform}
              onChange={(e) => onPatch({ platform: e.target.value as Platform })}
            >
              {PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.dateRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="d-target">
                업로드 목표일
              </label>
              <input
                id="d-target"
                type="date"
                className={styles.input}
                value={video.targetDate ?? ""}
                onChange={(e) =>
                  onPatch({ targetDate: e.target.value || undefined })
                }
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="d-pub">
                발행일
              </label>
              <input
                id="d-pub"
                type="date"
                className={styles.input}
                value={video.publishedDate ?? ""}
                onChange={(e) =>
                  onPatch({ publishedDate: e.target.value || undefined })
                }
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="d-idea">
              기획 / 후크 메모
            </label>
            <textarea
              id="d-idea"
              className={styles.textarea}
              value={video.ideaMemo ?? ""}
              placeholder="아이디어, 첫 마디, 레퍼런스…"
              onChange={(e) => onPatch({ ideaMemo: e.target.value || undefined })}
            />
          </div>

          <div className={styles.field}>
            <span className={styles.sectionTitle}>단계별 진행 · 메모</span>
            {STAGES.map((stage) => {
              const state = video.stages[stage.id];
              return (
                <div key={stage.id} className={styles.stageEdit}>
                  <div className={styles.stageEditHead}>
                    <StatusDot status={state.status} />
                    <span className={styles.stageEditName}>{stage.label}</span>
                    <StatusChips
                      value={state.status}
                      onChange={(status) => onSetStage(stage.id, { status })}
                    />
                  </div>
                  <div className={styles.stageInputs}>
                    <input
                      className={styles.input}
                      value={state.note ?? ""}
                      placeholder="메모 (예: BGM 저작권 확인)"
                      aria-label={`${stage.label} 메모`}
                      onChange={(e) =>
                        onSetStage(stage.id, { note: e.target.value })
                      }
                    />
                    <input
                      className={styles.input}
                      value={state.link ?? ""}
                      placeholder="링크 (대본·촬영본·편집본 URL)"
                      aria-label={`${stage.label} 링크`}
                      onChange={(e) =>
                        onSetStage(stage.id, { link: e.target.value })
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className={`${styles.btn} ${styles.btnDanger}`}
            onClick={onDelete}
          >
            이 영상 삭제
          </button>
        </div>
      </aside>
    </>
  );
}
