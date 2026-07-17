"use client";

import type { StageId, Video } from "@/lib/pipeline/types";
import { STAGES, STATUS_LABEL } from "@/lib/pipeline/stages";
import { StatusDot } from "./StatusDot";
import { PlatformPill } from "./PlatformPill";
import styles from "./pipeline.module.css";

interface PipelineTableProps {
  videos: ReadonlyArray<Video>;
  onCycleStage: (id: string, stageId: StageId) => void;
  onOpenVideo: (id: string) => void;
}

export function PipelineTable({
  videos,
  onCycleStage,
  onOpenVideo,
}: PipelineTableProps) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.titleCol}>영상</th>
            {STAGES.map((stage) => (
              <th key={stage.id}>{stage.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {videos.length === 0 && (
            <tr>
              <td colSpan={STAGES.length + 1} className={styles.empty}>
                아직 아이디어가 없어요. 위에서 떠오르는 걸 적어보세요.
              </td>
            </tr>
          )}
          {videos.map((video) => (
            <tr key={video.id} className={styles.row}>
              <td className={styles.titleCell}>
                <button
                  type="button"
                  className={styles.titleBtn}
                  onClick={() => onOpenVideo(video.id)}
                >
                  <span className={styles.videoNameRow}>
                    <span className={styles.videoName}>{video.title}</span>
                    <PlatformPill platform={video.platform} />
                  </span>
                  {video.ideaMemo && (
                    <span className={styles.ideaPreview}>{video.ideaMemo}</span>
                  )}
                </button>
              </td>
              {STAGES.map((stage) => {
                const state = video.stages[stage.id];
                return (
                  <td key={stage.id}>
                    <button
                      type="button"
                      className={styles.dotBtn}
                      onClick={() => onCycleStage(video.id, stage.id)}
                      aria-label={`${stage.label} ${STATUS_LABEL[state.status]} — 클릭하면 상태 변경`}
                      title={`${stage.label} · ${STATUS_LABEL[state.status]}${state.note ? ` · ${state.note}` : ""}`}
                    >
                      <StatusDot status={state.status} />
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
