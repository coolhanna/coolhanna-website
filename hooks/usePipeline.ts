"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { STAGE_IDS } from "@/lib/pipeline/stages";
import { SEED_VIDEOS } from "@/lib/pipeline/seed";
import { createVideo, loadVideos, saveVideos } from "@/lib/pipeline/storage";
import type { Platform, StageId, StageState, Video } from "@/lib/pipeline/types";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// 완료(초록) 아닌 상태(진행중/막힘)는 전부 대기(빈 것)로 — 2단계 모델로 정리.
function normalizeVideo(v: Video): Video {
  const stages = { ...v.stages };
  STAGE_IDS.forEach((id) => {
    if (stages[id] && stages[id].status !== "done") {
      stages[id] = { ...stages[id], status: "todo" };
    }
  });
  return { ...v, stages };
}

export interface PipelineApi {
  videos: Video[];
  ready: boolean;
  addVideo: (title: string, platform?: Platform) => string;
  patchVideo: (id: string, patch: Partial<Omit<Video, "id">>) => void;
  setStage: (id: string, stageId: StageId, patch: Partial<StageState>) => void;
  cycleStage: (id: string, stageId: StageId) => void;
  deleteVideo: (id: string) => void;
}

export function usePipeline(): PipelineApi {
  const [videos, setVideos] = useState<Video[]>([]);
  const [ready, setReady] = useState(false);
  const skipNextSave = useRef(true);

  // 최초 1회: 마운트 후 localStorage 읽기(없으면 시드).
  // 서버/첫 렌더와 불일치를 피하려 일부러 effect 에서 로드한다.
  useEffect(() => {
    const stored = loadVideos();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 외부 저장소(localStorage) 동기화
    setVideos((stored ?? SEED_VIDEOS).map(normalizeVideo));
    setReady(true);
  }, []);

  // 변경 시 저장 (초기 로드 직후 1회는 건너뜀)
  useEffect(() => {
    if (!ready) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    saveVideos(videos);
  }, [videos, ready]);

  const updateOne = useCallback(
    (id: string, transform: (video: Video) => Video) => {
      setVideos((prev) =>
        prev.map((v) =>
          v.id === id ? { ...transform(v), updatedAt: today() } : v,
        ),
      );
    },
    [],
  );

  const addVideo = useCallback((title: string, platform?: Platform) => {
    const video = createVideo(title, platform);
    setVideos((prev) => [video, ...prev]);
    return video.id;
  }, []);

  const patchVideo = useCallback(
    (id: string, patch: Partial<Omit<Video, "id">>) => {
      updateOne(id, (v) => ({ ...v, ...patch }));
    },
    [updateOne],
  );

  const setStage = useCallback(
    (id: string, stageId: StageId, patch: Partial<StageState>) => {
      updateOne(id, (v) => ({
        ...v,
        stages: {
          ...v.stages,
          [stageId]: { ...v.stages[stageId], ...patch },
        },
      }));
    },
    [updateOne],
  );

  // 클릭한 단계까지 전부 완료로 채운다. 앞 단계는 자동 완료.
  // 이미 최전방(마지막 완료)인 단계를 다시 누르면 한 칸 취소.
  const cycleStage = useCallback(
    (id: string, stageId: StageId) => {
      updateOne(id, (v) => {
        const idx = STAGE_IDS.indexOf(stageId);
        let progress = -1;
        STAGE_IDS.forEach((sid, i) => {
          if (v.stages[sid]?.status === "done") progress = i;
        });
        const target = idx === progress ? idx - 1 : idx;
        const stages = { ...v.stages };
        STAGE_IDS.forEach((sid, i) => {
          stages[sid] = { ...stages[sid], status: i <= target ? "done" : "todo" };
        });
        return { ...v, stages };
      });
    },
    [updateOne],
  );

  const deleteVideo = useCallback((id: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== id));
  }, []);

  return {
    videos,
    ready,
    addVideo,
    patchVideo,
    setStage,
    cycleStage,
    deleteVideo,
  };
}
