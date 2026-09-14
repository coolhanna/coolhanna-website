"use client";

import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { callApi } from "@/lib/dashboard-client";
import { useLiveResource } from "@/lib/use-live-resource";
import { canReconnectDraft, concernCounts, inConcernQueue, mergeConcernReceipt, nextConcernId, oldestConcernsFirst, originalGroups, type ConcernFilter, type DraftDispatch, type OriginalMessage } from "./concern-model";
import styles from "./concerns.module.css";

type Item = { id: string; title: string; summary: string; state: string; message_key: string; last_message_at: string; current_received_at?: string; has_previous?: boolean; has_current_concern?: boolean | null; recipient: string; workspace_status: string; workspace_revision: number; has_draft: boolean; draft_started_at?: string; notice: string; sources: { channel: string; label: string; url: string }[] };
type DraftService = { mode: "on_request" | "scheduled" | "paused" | "unknown"; last_checked_at: string | null };
type Feed = { items: Item[]; draft_service?: DraftService; checks?: { source: string; checked_at: string }[] };
type Message = OriginalMessage;
type Context = { recipient: string; account: string; channel: string; url: string; observed_at: string; complete: boolean; messages: Message[]; note: string };
type Version = { id: string; text: string; author: string; note: string; at: string };
type Workspace = { id: string; revision: number; status: string; draft: string; context: Context | null; context_current: boolean; item: Item; notice: string;
  reply_context?: { current_received_at: string | null; current_messages: Message[]; previous_messages: Message[]; actual_hanna_replies: Message[]; entry_messages?: Message[] };
  request?: { at: string; started_at?: string; prompt: string } | null;
  dispatch?: DraftDispatch | null;
  answered?: { at: string } | null;
  summary?: { bullets: string[]; context_signature: string; at: string } | null;
  versions: Version[]; exchanges: { role: string; text: string; at: string; request_id: string; references?: string[] }[];
  approval: { recipient: string; text: string; approved_at: string } | null;
  delivery: { at: string; text: string; evidence: string } | null };
type Action = "save" | "revise" | "prepare" | "approve" | "cancel" | "check_delivery" | "skip" | "restore" | "reconnect";
type Disposition = (workspace: Workspace, action: "skip" | "restore" | "approve") => void;
const states: Record<string, string> = { needs_context: "원문 확인 전", idle: "초안 필요", preparing: "초안·수정 요청 중", draft: "답변 검토", approved: "승인 완료 · 미전송", sending: "전송 확인 중", sent: "답장 완료", answered: "직접 답장 완료", skipped: "패스", blocked: "확인 필요", uncertain: "전송 결과 확인 중" };
const channel = (value: string) => value === "instagram" ? "인스타" : "카카오 채널";
const time = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ko-KR", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" });
};

const InboxMode = createContext(false);
const useInbox = () => {
  const general = useContext(InboxMode);
  return { general, api: general ? "dm-requests" : "concerns", title: general ? "협업·일반 DM" : "고민 DM" };
};

export default function ConcernBoard({ general = false }: { general?: boolean }) {
  return <InboxMode.Provider value={general}><InboxFeed key={general ? "general" : "concern"} /></InboxMode.Provider>;
}

function InboxFeed() {
  const { api, title } = useInbox();
  const { data, error, refresh } = useLiveResource<Feed | null>(null, api, { interval: 10000 });
  if (!data) return <main className={`dashboard-root ${styles.page}`}><header className={styles.pageHeader}><div><h1>{title}</h1><p>한 사람씩 읽고, 같이 고쳐서 답해요.</p></div></header><p role={error ? "alert" : "status"}>{error || "DM을 불러오고 있어요."}</p>{error && <button onClick={() => void refresh()}>다시 확인</button>}</main>;
  return <LoadedBoard data={data} error={error} refresh={refresh} />;
}

function LoadedBoard({ data, error, refresh }: { data: Feed; error: string; refresh: () => Promise<void> }) {
  const { general, title } = useInbox();
  // Choose once when the list first arrives. Incoming drafts must never switch
  // the conversation Hanna is reading or editing.
  const [selected, setSelected] = useState(() => oldestConcernsFirst(data.items).find(i => inConcernQueue(i, "open"))?.id || "");
  const [filter, setFilter] = useState<ConcernFilter>("open");
  const [search, setSearch] = useState("");
  const [receipts, setReceipts] = useState<Record<string, Item>>({});
  const [notice, setNotice] = useState("");
  // A completed mutation wins over an older poll already in flight. Once the
  // server catches up, its current state (including new messages) wins again.
  const items = oldestConcernsFirst(data.items.map(i => mergeConcernReceipt(i, receipts[i.id])));
  const visible = items.filter(i => inConcernQueue(i, filter) && `${i.title} ${i.recipient} ${i.summary}`.includes(search));
  const id = selected;
  const counts = concernCounts(items);
  const onUpdate = useCallback((workspace: Workspace) => {
    const material = workspace.reply_context;
    const item: Item = { ...workspace.item, workspace_status: workspace.status, workspace_revision: workspace.revision,
      recipient: workspace.context?.recipient || "", has_draft: Boolean(workspace.draft), notice: workspace.notice,
      current_received_at: workspace.context_current ? material?.current_received_at || workspace.item.last_message_at : workspace.item.last_message_at,
      has_previous: Boolean(material?.previous_messages.length),
      has_current_concern: workspace.context_current && workspace.context?.complete ? Boolean(material?.current_messages.length) : null,
      draft_started_at: workspace.request?.started_at };
    setReceipts(previous => previous[item.id]?.workspace_revision >= item.workspace_revision ? previous : { ...previous, [item.id]: item });
  }, []);
  const onDisposition: Disposition = (workspace, action) => {
    setNotice(action === "skip" ? "패스했어요. ‘패스’ 목록에서 다시 꺼낼 수 있어요." : action === "approve" ? "전송 대기로 옮겼어요. 검토는 끝났고, 아직 보내지는 않았어요." : "검토할 목록으로 되돌렸어요.");
    setSelected(previous => previous === workspace.id ? nextConcernId(visible, workspace.id) : previous);
  };
  const chooseFilter = (value: ConcernFilter) => {
    setFilter(value); setNotice("");
    setSelected(items.find(i => inConcernQueue(i, value) && `${i.title} ${i.recipient} ${i.summary}`.includes(search))?.id || "");
  };
  return <main className={`dashboard-root ${styles.page}`}>
    <header className={styles.pageHeader}><div><h1>{title}</h1><p>한 사람씩 읽고, 같이 고쳐서 답해요.</p></div><a href="/dashboard/diary">오늘로 돌아가기 ↗</a></header>
    <nav className={styles.stages} aria-label={`${title} 처리 현황`}>
      {([["open", "검토할 것"], ["preparing", "초안·수정 중"], ["queued", "전송 대기"], ["replied", "답장 완료"]] as const).map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => chooseFilter(value)}><span>{label}</span><b data-count={value}>{counts[value]}</b></button>)}
    </nav>
    <div className={styles.service}>
      <span>답변 검토 {counts.draft} · 초안 필요·원문 확인 {counts.needsDraft}</span>
      <span>저장은 검토 중 · 승인은 전송 대기 · 실제 발송 확인 후 완료</span>
      <details><summary>외부 DM은 마지막 확인 때의 기록이에요</summary><p>이 화면에서 처리한 내용은 바로 반영돼요. 인스타·카카오에서 직접 주고받은 메시지는 원문을 다시 확인한 뒤 반영돼요.</p>{(general ? ["instagram"] : ["instagram", "kakao_channel"]).map(source => <p key={source}>{channel(source)} · {data.checks?.find(c => c.source === source)?.checked_at ? time(data.checks.find(c => c.source === source)!.checked_at) : "확인 시각 없음"}</p>)}</details>
    </div>
    {error && <p className={styles.notice} role="alert">{error} <button onClick={() => void refresh()}>다시 확인</button></p>}
    {notice && <p className={styles.receipt} role="status">{notice}</p>}
    <div className={styles.workspace}>
      <aside className={styles.sidebar} aria-label={`${title} 목록`}>
        <div className={styles.filters}>{([["all", "전체"], ["skipped", "패스"], ["waiting", "본문 대기"]] as const).filter(([value]) => value !== "waiting" || counts.waiting > 0).map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => chooseFilter(value)}>{label} <b>{counts[value]}</b></button>)}</div>
        <input aria-label={`${title} 찾기`} placeholder="이름이나 이야기 찾기" value={search} onChange={e => setSearch(e.target.value)} />
        <p className={styles.sortHint}>이번 메시지 · 오래된 순</p>
        <div className={styles.list}>{visible.map(i => <button key={i.id} className={styles.listItem} aria-current={i.id === id ? "true" : undefined} onClick={() => setSelected(i.id)}>
          <span className={styles.meta}>{channel(i.sources[0]?.channel)} · {time(i.current_received_at || i.last_message_at)}</span>
          <strong>{i.recipient ? `${i.recipient} · ` : ""}{i.title}</strong>
          {i.has_previous && <span className={styles.meta}>이전 대화 있음</span>}
          <span className={i.workspace_status === "draft" ? styles.ready : styles.meta}>{i.workspace_status === "preparing" && i.draft_started_at ? "초안 작성 중" : i.has_current_concern === false && inConcernQueue(i, "waiting") ? "시작 버튼만 있음 · 본문 대기" : states[i.workspace_status] || "기다리는 이야기"}</span>
        </button>)}</div>
        {!data && !error && <p>DM을 불러오고 있어요.</p>}
        {data && !visible.length && <p className={styles.muted}>이 목록에 담긴 DM이 없어요.</p>}
        <small>{general ? "최근 요청함에서 확인한 협업·공구·일반 문의예요. 광고도 직접 보고 패스할 수 있어요." : "지금까지 확인한 고민이에요. 아직 전체 고민함을 다 읽은 것은 아니에요."}</small>
      </aside>
      {id ? <ConcernDetail key={id} id={id} onChange={() => void refresh()} onDisposition={onDisposition} onUpdate={onUpdate} /> : <div className={styles.placeholder}>{visible.length ? "왼쪽에서 이야기를 골라주세요." : "이 목록의 이야기를 모두 확인했어요."}</div>}
    </div>
  </main>;
}

function ConcernDetail({ id, onChange, onDisposition, onUpdate }: { id: string; onChange: () => void; onDisposition: Disposition; onUpdate: (workspace: Workspace) => void }) {
  const { api, title } = useInbox();
  const { data, error, refresh } = useLiveResource<Workspace | null>(null, `${api}/${id}`, { interval: 5000 });
  useEffect(() => { if (data) onUpdate(data); }, [data, onUpdate]);
  return <section className={styles.detail} aria-label={`${title} 원문과 답변`}>
    {error && <p className={styles.notice} role="alert">{error} <button onClick={() => void refresh()}>다시 확인</button></p>}
    {data ? <ReplyEditor workspace={data} onUpdate={onUpdate} onDisposition={onDisposition} refresh={() => { void refresh(); onChange(); }} /> : !error && <p>원문과 답변을 불러오고 있어요.</p>}
  </section>;
}

function ReplyEditor({ workspace: incoming, refresh, onDisposition, onUpdate }: { workspace: Workspace; refresh: () => void; onDisposition: Disposition; onUpdate: (workspace: Workspace) => void }) {
  const { api, general } = useInbox();
  const [saved, setSaved] = useState(incoming);
  const w = incoming.revision >= saved.revision ? incoming : saved;
  const cacheKey = general ? `hanna-dm-requests-edit:${w.id}` : `hanna-concern-edit:${w.id}`;
  const [editing, setEditing] = useState(() => {
    try { const cached = JSON.parse(sessionStorage.getItem(cacheKey) || "null"); if (cached && typeof cached.text === "string" && typeof cached.baseRevision === "number") return { text: cached.text as string, baseRevision: cached.baseRevision as number, dirty: true }; } catch { /* Session storage can be disabled. Server save remains available. */ }
    return { text: w.draft, baseRevision: w.revision, dirty: false };
  });
  const [requestText, setRequestText] = useState("");
  const [showEarlier, setShowEarlier] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [busy, setBusy] = useState("");
  const [problem, setProblem] = useState("");
  const [receipt, setReceipt] = useState("");
  const [confirm, setConfirm] = useState<{ revision: number; text: string; recipient: string; account: string; channel: string } | null>(null);
  const lock = useRef(false);
  const pending = useRef<{ fingerprint: string; request_id: string } | null>(null);
  const dirty = editing.dirty && editing.text !== w.draft;
  const changedElsewhere = editing.baseRevision !== w.revision && dirty;
  const locked = ["approved", "sending", "uncertain", "sent", "answered", "skipped"].includes(w.status);
  const textNow = dirty ? editing.text : w.draft;

  useEffect(() => {
    if (!dirty) return;
    const leave = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);

  function edit(value: string) {
    const next = { text: value, baseRevision: dirty ? editing.baseRevision : w.revision, dirty: true };
    setEditing(next); setConfirm(null); setReceipt("");
    try { sessionStorage.setItem(cacheKey, JSON.stringify(next)); } catch { setProblem("이 브라우저에 임시 보관할 수 없어요. ‘수정 저장’을 눌러주세요."); }
  }

  async function dispatch(action: Action, body: string, revision: number): Promise<Workspace> {
    const message_key = action === "skip" || action === "restore" ? w.item.message_key : undefined;
    const fingerprint = JSON.stringify([w.id, action, body, revision, message_key]);
    const attempt = pending.current?.fingerprint === fingerprint ? pending.current : { fingerprint, request_id: crypto.randomUUID() };
    pending.current = attempt;
    const result = await callApi<Workspace>("POST", `${api}/${w.id}`, { action, body, expected_revision: revision, request_id: attempt.request_id, message_key });
    pending.current = null;
    const next = result;
    setSaved(next);
    onUpdate(next);
    return next;
  }

  async function act(action: Action) {
    if (lock.current) return;
    lock.current = true; setBusy(action); setProblem(""); setReceipt("");
    try {
      let current = w;
      if ((action === "save" || action === "revise" || action === "skip") && dirty && !locked) {
        current = await dispatch("save", textNow, w.revision);
        setEditing({ text: current.draft, baseRevision: current.revision, dirty: false });
        try { sessionStorage.removeItem(cacheKey); } catch { /* Durable save already succeeded. */ }
      }
      if (action !== "save") {
        current = await dispatch(action, action === "approve" ? confirm?.text || "" : action === "revise" ? requestText : "", action === "approve" ? confirm?.revision || 0 : current.revision);
      }
      if (action === "revise") setRequestText("");
      setConfirm(null);
      if (action === "skip" || action === "restore" || action === "approve") {
        const applied = action === "skip" ? current.status === "skipped" : action === "approve" ? current.status === "approved" : ["draft", "idle", "needs_context"].includes(current.status);
        if (applied) onDisposition(current, action);
        else setReceipt("요청 뒤 상태가 바뀌었어요. 현재 상태를 표시했어요.");
        return;
      }
      setReceipt(action === "save" ? "수정한 답변을 저장했어요." : action === "cancel" ? "대기를 취소했어요. 다시 고칠 수 있어요." : "요청을 저장했어요. 코덱스로 전달할게요.");
    } catch (e) {
      setProblem(e instanceof Error && e.message.includes("409") ? "원문이나 답변이 바뀌었어요. 최신 내용을 확인하고 다시 눌러주세요. 고치던 문장은 그대로 있어요." : "저장 결과를 확인하지 못했어요. 다시 누르면 같은 요청으로 확인해요.");
    } finally { lock.current = false; setBusy(""); refresh(); }
  }

  function restoreVersion(value: string) { edit(value); }
  const c = w.context;
  const fallback = originalGroups(c?.messages || []);
  const recentMessages = w.reply_context?.current_messages || fallback.recent;
  const earlierMessages = w.reply_context?.previous_messages || fallback.earlier;
  const entryMessages = w.reply_context?.entry_messages || fallback.entries;
  const entryOnly = Boolean(c?.complete && w.context_current && !recentMessages.length && entryMessages.length);
  const hasSummary = Boolean(w.summary?.bullets.length);
  const incomingLength = recentMessages.filter(m => m.role === "inbound").reduce((sum, m) => sum + m.text.length, 0);
  const compactOriginal = hasSummary && incomingLength > 450;
  function message(m: Message, index: number) {
    return <div key={index} className={m.role === "hanna" ? styles.hannaMessage : styles.message}><span className={styles.meta}>{m.role === "hanna" ? "한나가 보낸 답장" : c?.recipient} · {time(m.at)}</span>{m.text && <p>{m.text}</p>}{m.attachments?.map(a => <OriginalImage key={a.id} conversationId={w.id} asset={a} />)}</div>;
  }
  return <>
    <header className={styles.conversationHeader}><div><span className={styles.meta}>{c ? `${channel(c.channel)} · ${c.account}` : channel(w.item.sources[0]?.channel)}</span><h2>{c?.recipient || w.item.title}</h2></div><div className={styles.disposition}><span className={styles.status}>{w.status === "preparing" && w.request?.started_at ? "초안 작성 중" : entryOnly && !locked ? "시작 버튼만 있음" : states[w.status]}</span>{w.status === "skipped" ? <button disabled={Boolean(busy)} onClick={() => void act("restore")}>답장할 목록으로</button> : !["sent", "answered", "sending", "uncertain"].includes(w.status) && !["resolved", "waiting_partner"].includes(w.item.state) && <button disabled={Boolean(busy)} onClick={() => void act("skip")}>패스 →</button>}</div></header>
    {w.notice && <p className={styles.notice}>{w.notice}</p>}
    <div className={styles.original}>
      <div className={styles.sectionHeading}><h3>이번에 받은 이야기</h3>{c && <a href={c.url} target="_blank" rel="noreferrer">실제 대화 ↗</a>}</div>
      {c ? <>
        {entryMessages.length > 0 && <details className={styles.entryInfo}><summary>상담 시작 버튼{entryOnly ? " · 아직 고민 본문 없음" : " · 본문에서 분리"}</summary>{entryMessages.map((m, i) => <p key={i}>{time(m.at)} · {m.text}</p>)}</details>}
        {hasSummary && !entryOnly && <div className={styles.summary}><span>짧게 읽기</span><ul>{w.summary!.bullets.map((line, index) => <li key={index}>{line}</li>)}</ul></div>}
        {earlierMessages.length > 0 && <div className={styles.history}><button aria-expanded={showEarlier} onClick={() => setShowEarlier(!showEarlier)}>{showEarlier ? "이전 대화 접기 ↑" : "이전 대화 있음 · 보기"}</button>{showEarlier && <div className={styles.messages}>{earlierMessages.map(message)}</div>}</div>}
        {compactOriginal && <button className={styles.originalToggle} aria-expanded={showOriginal} onClick={() => setShowOriginal(!showOriginal)}>{showOriginal ? "원문 접기 ↑" : "원문 전체 보기 ↓"}</button>}
        {(!compactOriginal || showOriginal) && <div className={styles.messages}>{recentMessages.map(message)}</div>}
        <details className={styles.sourceInfo}><summary>{time(c.observed_at)} 원문 확인{!w.context_current ? " · 새 메시지 확인 필요" : ""}</summary><p>{c.note || "실제로 읽은 메시지예요."}</p>{!c.complete && <p>아직 확인하지 못한 원문이 있어요.</p>}</details>
      </> : <><p className={styles.muted}>{w.item.summary}</p><p className={styles.meta}>지금은 요약만 있어요. 원문을 읽은 뒤 초안을 준비할게요.</p></>}
    </div>

    <div className={styles.reply}>
      <div className={styles.sectionHeading}><h3>{["sent", "answered"].includes(w.status) ? "답장 완료" : "함께 다듬는 답변"}</h3><span className={styles.meta}>{w.status === "answered" ? "직접 보낸 답장 확인됨" : w.versions.length ? `${w.versions.length}개 버전` : "아직 초안 전"}</span></div>
      {w.status === "answered" ? <p className={styles.answered}>{w.answered?.at && `${time(w.answered.at)}에 `}답장을 보냈어요. 다시 답할 필요 없어요. 새 메시지가 수집되면 답장할 목록에 다시 올라와요.</p> : w.status === "sent" && w.delivery ? <><p className={styles.sentText}>{w.delivery.text}</p><small>{time(w.delivery.at)} 전송 확인</small></> : <>
        {(w.draft || dirty || (general && !locked)) && <><label className={styles.srOnly} htmlFor="reply-body">답변 직접 수정</label><textarea id="reply-body" maxLength={12000} className={styles.editor} value={locked ? w.approval?.text || w.draft : textNow} disabled={locked || Boolean(busy)} onChange={e => edit(e.target.value)} />
          <div className={styles.editFooter}><span>{dirty ? "수정 중 · 이 브라우저에 임시 보관" : "저장된 답변"}</span><button disabled={!dirty || locked || Boolean(busy)} onClick={() => void act("save")}>수정 저장</button></div></>}
        {changedElsewhere && <p className={styles.notice}>새 초안이나 기록이 도착했어요. 고치던 글도 임시 보관하고 있어요. <button disabled={Boolean(busy)} onClick={() => { setEditing({ text: w.draft, baseRevision: w.revision, dirty: false }); try { sessionStorage.removeItem(cacheKey); } catch { /* No cached text. */ } }}>새 초안 보기</button></p>}
        {!w.draft && !dirty && <p className={styles.muted}>{w.status === "skipped" ? "이번 이야기는 답장하지 않고 보관했어요." : w.status === "preparing" ? "요청은 저장됐고, 아직 초안이 도착하지 않았어요." : entryOnly ? "버튼을 누른 기록이에요. 실제 고민이 확인되면 답변을 준비해요." : "원문은 준비됐어요. 아래 버튼을 누르면 초안을 만들어요."}</p>}
        {w.status === "approved" && <div className={styles.queued}><p><strong>{w.approval?.recipient}</strong>에게 보낼 답장을 모아두었어요. 일괄 전송을 시작할 때 보내며, 지금은 미전송이에요.</p><small>{w.approval?.approved_at && `${time(w.approval.approved_at)} 승인`}</small><p>이 작업에 ‘모아둔 답장 보내자’고 말하면 함께 처리해요.</p><button disabled={Boolean(busy)} onClick={() => void act("cancel")}>대기에서 빼고 더 고치기</button></div>}
        {w.status === "sending" && <p className={styles.notice}>실제 대화에서 전송을 확인하고 있어요.</p>}
        {w.status === "uncertain" && <button disabled={Boolean(busy)} onClick={() => void act("check_delivery")}>전송 결과 확인 요청</button>}
        {!locked && <>
          {w.status === "preparing" && <div className={styles.preparing} role="status"><p>{w.request?.started_at ? `초안을 다듬고 있어요. ${time(w.request.started_at)} 시작` : w.dispatch?.state === "accepted" ? `코덱스에 도착했어요. ${time(w.dispatch.updated_at)}` : w.dispatch?.error || "요청을 저장했어요. 코덱스에 연결하고 있어요."}<br />{w.request?.started_at ? "완성되면 이 화면의 답변이 자동으로 바뀌어요." : w.dispatch?.state === "accepted" ? "이 코덱스 작업에서 이어서 다듬어요. 다른 일을 처리 중이면 조금 기다릴 수 있어요." : "앱을 열어 두면 이 작업으로 연결돼요."}</p>{canReconnectDraft(w.dispatch, w.request?.started_at) && <button disabled={Boolean(busy)} onClick={() => void act("reconnect")}>다시 연결</button>}<button disabled={Boolean(busy)} onClick={() => void act("cancel")}>요청 취소</button></div>}
          {!w.draft && w.status !== "preparing" && !entryOnly && <button className={styles.primary} disabled={Boolean(busy)} onClick={() => void act("prepare")}>원문 읽고 초안 준비하기</button>}
          {w.draft && <div className={styles.coaching}>
            <label htmlFor="reply-request">어떻게 바꿔볼까요?</label>
            {w.exchanges.length > 0 && <details className={styles.history}><summary>지금까지 함께 고친 이야기 {w.exchanges.length}개</summary>{w.exchanges.map((e, i) => <div key={i} className={e.role === "hanna" ? styles.exchangeHanna : styles.exchange}><small>{e.role === "hanna" ? "한나" : "답변 도우미"} · {time(e.at)}</small><p>{e.text}</p></div>)}</details>}
            {w.exchanges.at(-1)?.role === "assistant" && <p className={styles.assistantNote}>{w.exchanges.at(-1)?.text}</p>}
            <div className={styles.requestRow}><textarea id="reply-request" maxLength={2000} placeholder={general ? "조건을 먼저 물어보고 싶어. 정중하고 간단하게 써줘." : "너무 가르치는 느낌이야. 더 편하게 말해줘."} value={requestText} onChange={e => setRequestText(e.target.value)} disabled={Boolean(busy)} /><button disabled={!requestText.trim() || Boolean(busy) || w.status === "preparing"} onClick={() => void act("revise")}>다시 다듬기</button></div>
            <small>수정한 답변과 요청을 함께 보내요. 여러 번 다듬어도 괜찮아요.</small>
          </div>}
        </>}
      </>}
      {w.versions.length > 0 && <details className={styles.history}><summary>{w.status === "answered" ? "보내지 않은 초안 보관함" : "이전 답변 보기 · 되돌리기"}</summary>{[...w.versions].reverse().map((v, i) => <article key={v.id}><div className={styles.sectionHeading}><strong>{w.versions.length - i}안 · {v.author === "hanna" ? "한나 수정" : "초안"}</strong><small>{time(v.at)}</small></div><p>{v.text}</p>{!locked && <button disabled={Boolean(busy)} onClick={() => restoreVersion(v.text)}>이 문장으로 다시 고치기</button>}</article>)}</details>}
      {problem && <p className={styles.notice} role="alert">{problem}</p>}
      {receipt && <p className={styles.receipt} role="status">{receipt}</p>}
      {!locked && w.draft && <div className={styles.sendArea}>
        {confirm ? <div className={styles.confirm}><strong>{confirm.recipient}에게 보내는 답변이에요.</strong><p>{channel(confirm.channel)} · {confirm.account}</p><p className={styles.confirmText}>{confirm.text}</p>{confirm.revision !== w.revision && <p role="alert">원문이나 초안이 바뀌었어요. 닫고 최신 답변을 다시 확인해 주세요.</p>}<div><button className={styles.primary} disabled={Boolean(busy) || dirty || w.status !== "draft" || confirm.revision !== w.revision} onClick={() => void act("approve")}>이 문구로 보내기 승인</button><button disabled={Boolean(busy)} onClick={() => setConfirm(null)}>더 고칠게</button></div></div> : <><span>{dirty ? "고친 문장을 먼저 저장해 주세요." : !w.context_current || !c?.complete ? "최신 원문을 먼저 확인해야 해요." : "검토를 마치면 전송 대기에 담아주세요."}</span><button className={styles.primary} disabled={dirty || Boolean(busy) || w.status !== "draft" || !w.context_current || !c?.complete} onClick={() => c && setConfirm({ revision: w.revision, text: w.draft, recipient: c.recipient, account: c.account, channel: c.channel })}>보낼 답변 확인 →</button></>}
      </div>}
      {!locked && <p className={styles.footnote}>버튼을 누르면 이 코덱스 작업으로 요청해요. 요청이 없을 때는 AI를 깨우지 않아요. 승인한 답장은 따로 모아서 보내요.</p>}
    </div>
  </>;
}

function OriginalImage({ conversationId, asset }: { conversationId: string; asset: { id: string; label: string } }) {
  const [expanded, setExpanded] = useState(false);
  const { api } = useInbox();
  const src = `/api/dashboard/proxy/${api}/${encodeURIComponent(conversationId)}/attachments/${encodeURIComponent(asset.id)}`;
  return <div className={styles.attachment}>
    <button aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{asset.label} {expanded ? "접기 ↑" : "보기 ↓"}</button>
    {expanded && <a href={src} target="_blank" rel="noreferrer">
      {/* The authenticated image route preserves originals and forbids shared caching. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={asset.label} />
    </a>}
  </div>;
}
