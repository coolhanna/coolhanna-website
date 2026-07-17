"use client";

import { useMemo, useState } from "react";
import { usePipeline } from "@/hooks/usePipeline";
import { STAGE_IDS } from "@/lib/pipeline/stages";
import type { Video } from "@/lib/pipeline/types";
import { PipelineTable } from "./PipelineTable";
import { AddVideoBar } from "./AddVideoBar";
import { VideoDrawer } from "./VideoDrawer";
import styles from "./pipeline.module.css";

/** 7단계 모두 완료 = 완결 영상 (기본 목록에서 접음) */
function isDone(v: Video): boolean {
  return STAGE_IDS.every((id) => v.stages[id]?.status === "done");
}

export function Dashboard() {
  const {
    videos,
    ready,
    addVideo,
    patchVideo,
    setStage,
    cycleStage,
    deleteVideo,
  } = usePipeline();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [today] = useState(() => new Date());
  const [showDone, setShowDone] = useState(false);

  const active = useMemo(() => videos.filter((v) => !isDone(v)), [videos]);
  const doneVideos = useMemo(() => videos.filter(isDone), [videos]);
  const selected = videos.find((v) => v.id === selectedId) ?? null;

  function handleAdd(title: string, platform: Parameters<typeof addVideo>[1]) {
    const id = addVideo(title, platform);
    setSelectedId(id);
  }

  function handleDelete(id: string) {
    deleteVideo(id);
    setSelectedId(null);
  }

  if (!ready) {
    return <div style={{ minHeight: "40vh" }} aria-busy />;
  }

  return (
    <>
      <div className={styles.toolbar}>
        <AddVideoBar onAdd={handleAdd} />
      </div>

      <PipelineTable
        videos={active}
        onCycleStage={cycleStage}
        onOpenVideo={setSelectedId}
      />

      {doneVideos.length > 0 && (
        <div className={styles.doneWrap}>
          <button
            type="button"
            className={styles.doneToggle}
            onClick={() => setShowDone((s) => !s)}
          >
            완료 {doneVideos.length}개 {showDone ? "숨기기 ▲" : "보기 ▼"}
          </button>
          {showDone && (
            <PipelineTable
              videos={doneVideos}
              onCycleStage={cycleStage}
              onOpenVideo={setSelectedId}
            />
          )}
        </div>
      )}

      {selected && (
        <VideoDrawer
          video={selected}
          today={today}
          onPatch={(patch) => patchVideo(selected.id, patch)}
          onSetStage={(stageId, patch) => setStage(selected.id, stageId, patch)}
          onDelete={() => handleDelete(selected.id)}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}
