"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { DashboardFeedbackItem, DashboardFeedbackResponse } from "@/lib/dashboard-api";
import styles from "./dashboard-feedback-loop.module.css";

type Action = DashboardFeedbackItem["action"];

const pageLabels: Record<string, string> = {
  operations: "운영", desk: "한나 데스크", briefing: "브리핑", day: "하루",
  curation: "큐레이션", planning: "기획", products: "제품", reels: "릴스",
  "reels-benchmark": "벤치마크", youtube: "유튜브", uploads: "업로드",
  purchases: "산 것", meals: "먹은 것", thoughts: "생각", health: "건강",
  ads: "광고", gongu: "공구", revenue: "매출", hyerin: "혜린",
  insights: "인사이트", pipeline: "파이프라인", editing: "편집", "shorts-ops": "숏폼 운영실",
};

const actions: Array<{ value: Action; label: string; hint: string }> = [
  { value: "confirm", label: "맞아", hint: "지금 내용이 맞음" },
  { value: "correct", label: "수정 필요", hint: "틀린 내용을 고침" },
  { value: "missing", label: "빠졌어", hint: "보여야 할 것이 없음" },
  { value: "more", label: "더 해줘", hint: "다음부터 더 찾음" },
  { value: "stop", label: "그만 보여줘", hint: "불필요한 것을 줄임" },
];

const statusLabel: Record<DashboardFeedbackItem["status"], string> = {
  pending: "반영 대기",
  routed: "전달됨",
  applied: "반영 완료",
  rejected: "확인 필요",
};

const emptyResponse: DashboardFeedbackResponse = {
  items: [], events: [], counts: { pending: 0, routed: 0, applied: 0, rejected: 0 },
};

export default function DashboardFeedbackLoop() {
  const pathname = usePathname();
  const scope = pathname === "/dashboard" ? "operations" : pathname.split("/")[2] || "operations";
  const pageLabel = pageLabels[scope] || scope;
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<Action>("missing");
  const [note, setNote] = useState("");
  const [data, setData] = useState<DashboardFeedbackResponse>(emptyResponse);
  const [state, setState] = useState<"idle" | "loading" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  const unresolved = useMemo(() => data.counts.pending + data.counts.routed, [data.counts]);
  const noteRequired = action !== "confirm";

  useEffect(() => {
    if (scope === "login") return;
    let active = true;
    setState("loading");
    fetch(`/api/dashboard/proxy/dashboard-feedback?scope=${encodeURIComponent(scope)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.detail || payload?.error || "피드백을 읽지 못했어");
        if (active) { setData(payload); setState("idle"); }
      })
      .catch((error) => { if (active) { setMessage((error as Error).message); setState("error"); } });
    return () => { active = false; };
  }, [scope]);

  if (scope === "login") return null;

  async function save() {
    if (noteRequired && !note.trim()) { setMessage("무엇을 바꿀지 한 줄만 적어줘."); return; }
    setState("saving"); setMessage("");
    try {
      const response = await fetch("/api/dashboard/proxy/dashboard-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope, page_label: pageLabel, action, note: note.trim(),
          context: { path: pathname, title: document.title },
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.detail || payload?.error || "저장하지 못했어");
      setData(payload); setNote(""); setState("saved");
      setMessage(action === "confirm" ? "맞다고 기록했어. 같은 판단을 다음 추천에 반영해." : "저장했어. 담당 루프로 전달하고 반영 상태를 여기서 보여줄게.");
    } catch (error) { setState("error"); setMessage((error as Error).message); }
  }

  return <div className={styles.root}>
    <button type="button" className={styles.trigger} onClick={() => setOpen((value) => !value)} aria-expanded={open}>
      <span>피드백</span>{unresolved > 0 && <b>{unresolved}</b>}
    </button>
    {open && <aside className={styles.panel} aria-label={`${pageLabel} 피드백`}>
      <header><div><small>FEEDBACK LOOP</small><h2>{pageLabel}</h2><p>이 판단이 다음 수집·추천·정리에 이어져.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="피드백 닫기">×</button></header>

      <div className={styles.actions}>{actions.map((item) => <button key={item.value} type="button" className={action === item.value ? styles.selected : ""} onClick={() => setAction(item.value)}><b>{item.label}</b><span>{item.hint}</span></button>)}</div>

      <label className={styles.note}><span>{noteRequired ? "무엇을 바꿀까?" : "덧붙일 말 (선택)"}</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder={action === "stop" ? "예: 지난달 완료 항목은 이제 그만 보여줘" : "예: 오늘 완료한 업로드가 빠졌어"} /></label>
      <button type="button" className={styles.save} disabled={state === "saving"} onClick={save}>{state === "saving" ? "저장 중…" : "다음 루프에 반영"}</button>
      {message && <p className={state === "error" ? styles.error : styles.message} aria-live="polite">{message}</p>}

      <section className={styles.history}>
        <div><h3>이 화면 피드백</h3><span>대기 {data.counts.pending} · 전달 {data.counts.routed} · 완료 {data.counts.applied}</span></div>
        {data.items.slice(0, 5).map((item) => <article key={item.id}><b>{actions.find((entry) => entry.value === item.action)?.label}</b><p>{item.note || "현재 내용이 맞다고 확인"}</p><span className={styles[item.status]}>{statusLabel[item.status]}</span>{item.result && <em>{item.result}</em>}</article>)}
        {!data.items.length && <p className={styles.empty}>아직 남긴 피드백이 없어.</p>}
      </section>
    </aside>}
  </div>;
}
