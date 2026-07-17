import { STAGE_IDS } from "./stages";
import type { Video } from "./types";

export interface PipelineSummary {
  working: number;
  waitingUpload: number;
  published: number;
  notStarted: number;
}

/** 영상이 "발행 완료" 상태인지 (업로드 단계가 done) */
function isPublished(video: Video): boolean {
  return video.stages.upload.status === "done";
}

/** 아직 아무 단계도 완료 안 한 것 */
function notStarted(video: Video): boolean {
  return STAGE_IDS.every((id) => video.stages[id].status !== "done");
}

/** 진행중(작업중)인지: 발행 전이면서 어딘가 done 이 있는 상태 */
function isWorking(video: Video): boolean {
  if (isPublished(video)) return false;
  return STAGE_IDS.some((id) => video.stages[id].status === "done");
}

export function summarize(videos: ReadonlyArray<Video>): PipelineSummary {
  return videos.reduce<PipelineSummary>(
    (acc, video) => ({
      working: acc.working + (isWorking(video) ? 1 : 0),
      waitingUpload:
        acc.waitingUpload +
        (!isPublished(video) && video.stages.edit.status === "done" ? 1 : 0),
      published: acc.published + (isPublished(video) ? 1 : 0),
      notStarted: acc.notStarted + (notStarted(video) ? 1 : 0),
    }),
    { working: 0, waitingUpload: 0, published: 0, notStarted: 0 },
  );
}
