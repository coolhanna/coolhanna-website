import { callApi } from "./dashboard-client.ts";
import { isIntakeJob, isIntakeJobsResponse } from "./intake-types.ts";
import type { IntakeAttempt, IntakeJob, IntakeJobsResponse } from "./intake-types.ts";

export async function getIntakeJobs(limit = 20, sourceId?: string): Promise<IntakeJobsResponse> {
  const value: unknown = await callApi("GET", `intake/jobs?limit=${limit === 100 ? 100 : 20}${sourceId ? `&source_id=${encodeURIComponent(sourceId)}` : ""}`);
  if (!isIntakeJobsResponse(value)) throw new Error("Invalid intake response");
  return value;
}

export async function applyIntakeAttempt(jobId: string, attempt: IntakeAttempt): Promise<IntakeJob> {
  const value: unknown = await callApi("POST", `intake/jobs/${encodeURIComponent(jobId)}/${attempt.operation}`, attempt.body);
  if (!value || typeof value !== "object" || !("ok" in value) || value.ok !== true || !("job" in value) || !isIntakeJob(value.job) || value.job.id !== jobId) throw new Error("Invalid intake acknowledgement");
  return value.job;
}

export function intakeErrorMessage(error: unknown, mutation = false): string {
  const message = error instanceof Error ? error.message : "";
  if (/API (401|403)/.test(message)) return "로그인 상태를 확인한 뒤 다시 시도해 주세요. 남긴 원문과 답변 초안은 유지돼요.";
  if (message.includes("API 409")) return "그동안 처리 내용이 바뀌었어요. 최신 결과를 확인한 뒤 다시 선택해 주세요. 답변 초안은 그대로예요.";
  if (message.includes("API 422")) return "요청한 내용을 적용할 수 없어 그대로 두었어요. 최신 질문과 답변을 확인해 주세요.";
  return mutation ? "반영 여부를 확인하지 못했어요. 같은 요청으로 다시 확인하면 중복 처리되지 않아요." : "정리 상태를 불러오지 못했어요. 메모 저장 여부와는 별개예요. 잠시 뒤 다시 확인해 주세요.";
}
