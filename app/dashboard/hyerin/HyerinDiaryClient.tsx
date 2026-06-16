"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  DndContext,
  type DragEndEvent,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type {
  HyerinDiaryStateResponse,
  HyerinDiaryTodo,
} from "@/lib/dashboard-api";

interface Props {
  initial: HyerinDiaryStateResponse;
}

const GROWTH = [
  { key: "성장 - 글쓰기", label: "글쓰기", emoji: "✏️", cls: "c-write" },
  { key: "성장 - 영어회화", label: "영어회화", emoji: "💬", cls: "c-eng" },
  { key: "성장 - 영상", label: "영상", emoji: "🎬", cls: "c-vid" },
  { key: "성장 - 책", label: "책", emoji: "📖", cls: "c-book" },
  { key: "성장 - 러닝", label: "러닝", emoji: "🏃", cls: "c-run" },
] as const;

const VIDEO_STAGES = ["아이디어", "기획", "대본", "촬영", "편집", "업로드끝"] as const;

const PIN_TONE: Record<string, string> = {
  danger: "pin",
  warning: "pin calm",
  info: "pin info",
  calm: "pin calm",
};

async function callApi(method: string, path: string, body?: unknown): Promise<Response> {
  return fetch(`/api/dashboard/proxy/${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
}

export default function HyerinDiaryClient({ initial }: Props) {
  const [state, setState] = useState<HyerinDiaryStateResponse>(initial);
  const [weekStart, setWeekStart] = useState<string>(initial.week.start);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(
    async (start?: string) => {
      const s = start ?? weekStart;
      const r = await fetch(
        `/api/dashboard/proxy/hyerin/diary/state?start=${s}`,
        { cache: "no-store" },
      );
      if (r.ok) {
        const data = (await r.json()) as HyerinDiaryStateResponse;
        setState(data);
      }
    },
    [weekStart],
  );

  async function withBusy(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  function shiftWeek(deltaDays: number) {
    const d = new Date(`${weekStart}T00:00:00`);
    d.setDate(d.getDate() + deltaDays);
    const s = d.toISOString().slice(0, 10);
    setWeekStart(s);
    refresh(s);
  }

  const { today, week, pins, seeds, seeds_total, video, routine_def, stats, progress } =
    state;

  return (
    <div className="diary-root">
      <style>{CSS}</style>

      <Header
        date={today.date}
        seedsTotal={seeds_total}
        busy={busy}
        seeds={seeds}
        onSeed={(t) =>
          withBusy(() => callApi("POST", "hyerin/diary/seed", { text: t }))
        }
      />

      <StatsBar stats={stats} progress={progress} />

      <Pins
        pins={pins}
        busy={busy}
        onAdd={(p) => withBusy(() => callApi("POST", "hyerin/diary/pin", p))}
        onDelete={(idx) =>
          withBusy(() => callApi("DELETE", "hyerin/diary/pin", { index: idx }))
        }
      />

      <Week
        weekLabel={week.start}
        days={week.days}
        busy={busy}
        onShift={shiftWeek}
        onToggleChip={(date, section, line) =>
          withBusy(() =>
            callApi("PATCH", "hyerin/diary/todo/toggle", { section, line, date }),
          )
        }
      />

      <div className="row two-col">
        <Section
          title="학교"
          emoji="🎒"
          tag="t-sch"
          todos={today.sections["학교"] ?? []}
          busy={busy}
          onToggle={(line) =>
            withBusy(() =>
              callApi("PATCH", "hyerin/diary/todo/toggle", { section: "학교", line }),
            )
          }
          onAdd={(text) =>
            withBusy(() => callApi("POST", "hyerin/diary/todo", { section: "학교", text }))
          }
          onDelete={(line) =>
            withBusy(() => callApi("DELETE", "hyerin/diary/todo", { section: "학교", line }))
          }
        />

        <Growth
          sections={today.sections}
          busy={busy}
          onToggle={(section, line) =>
            withBusy(() =>
              callApi("PATCH", "hyerin/diary/todo/toggle", { section, line }),
            )
          }
          onAdd={(section, text) =>
            withBusy(() => callApi("POST", "hyerin/diary/todo", { section, text }))
          }
          onDelete={(section, line) =>
            withBusy(() => callApi("DELETE", "hyerin/diary/todo", { section, line }))
          }
        />
      </div>

      <VideoKanban
        video={video}
        busy={busy}
        onMove={(from, to, text) =>
          withBusy(() =>
            callApi("PATCH", "hyerin/diary/video", {
              from_stage: from,
              to_stage: to,
              text,
            }),
          )
        }
        onAdd={(stage, text) =>
          withBusy(() => callApi("POST", "hyerin/diary/video", { stage, text }))
        }
      />

      <div className="row two-col">
        <DiaryNote
          existing={today.일기}
          busy={busy}
          onAppend={(text) =>
            withBusy(() =>
              callApi("PATCH", "hyerin/diary/note", { text, mode: "append" }),
            )
          }
        />
        <Routine
          def={routine_def}
          done={today.routine_done}
          busy={busy}
          onToggle={(item) =>
            withBusy(() => callApi("PATCH", "hyerin/diary/routine", { item }))
          }
          onAddDef={(item) =>
            withBusy(() => callApi("POST", "hyerin/diary/routine_def", { item }))
          }
          onDeleteDef={(item) =>
            withBusy(() => callApi("DELETE", "hyerin/diary/routine_def", { item }))
          }
        />
      </div>

      <SeedsBox
        seeds={seeds}
        seedsTotal={seeds_total}
        busy={busy}
        onAdd={(t) =>
          withBusy(() => callApi("POST", "hyerin/diary/seed", { text: t }))
        }
      />
    </div>
  );
}

function Header({
  date,
  seedsTotal,
  busy,
  seeds,
  onSeed,
}: {
  date: string;
  seedsTotal: number;
  busy: boolean;
  seeds: string[];
  onSeed: (t: string) => void;
}) {
  void busy;
  void onSeed;
  void seeds;
  const d = new Date(`${date}T00:00:00`);
  const wd = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return (
    <div className="hdr">
      <div>
        <h1>혜린이 다이어리</h1>
        <p>
          {d.getMonth() + 1}월 {d.getDate()}일 ({wd}) · 끝나면 도장 1개 · 씨앗 {seedsTotal}개
        </p>
      </div>
    </div>
  );
}

function StatsBar({
  stats,
  progress,
}: {
  stats: HyerinDiaryStateResponse["stats"];
  progress: HyerinDiaryStateResponse["progress"];
}) {
  const pct = Math.min(100, Math.round((stats.today_chars / stats.today_goal) * 100));
  const listPct = Math.min(
    100,
    Math.round((progress.리스트.누적 / progress.리스트.목표) * 100),
  );
  return (
    <>
      <div className="row">
        <div className="metric">
          <span className="lbl">오늘</span>
          <span className="num">{stats.today_chars.toLocaleString()}</span>
          <span className="unit">자</span>
          <div className="bar">
            <div className="fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="muted">/ {stats.today_goal.toLocaleString()}</span>
        </div>
        <div className="metric metric-sm">
          <span className="lbl">이번 주</span>
          <span className="num">{stats.week_chars.toLocaleString()}</span>
          <span className="unit">자</span>
        </div>
        <div className="metric metric-sm">
          <span className="lbl">이번 달</span>
          <span className="num">{stats.month_chars.toLocaleString()}</span>
          <span className="unit">자</span>
        </div>
      </div>
      <div className="row">
        <div className="metric amber" style={{ flex: 1.3 }}>
          <span className="lbl">📖 리스트</span>
          <span className="num num-md">{progress.리스트.누적.toLocaleString()}</span>
          <span className="unit">/ {progress.리스트.목표.toLocaleString()}</span>
          <div className="bar">
            <div className="fill" style={{ width: `${listPct}%` }} />
          </div>
          <span className="muted strong">{listPct}%</span>
        </div>
        <div className="metric amber" style={{ flex: 1 }}>
          <span className="lbl">✍ 에샤</span>
          <span className="num num-md">{progress.에샤.chapter}</span>
          <span className="muted">화</span>
        </div>
      </div>
    </>
  );
}

function Pins({
  pins,
  busy,
  onAdd,
  onDelete,
}: {
  pins: HyerinDiaryStateResponse["pins"];
  busy: boolean;
  onAdd: (p: { text: string; tone: string; icon: string }) => void;
  onDelete: (idx: number) => void;
}) {
  const [show, setShow] = useState(false);
  const [val, setVal] = useState("");
  return (
    <div className="card pad-tight">
      <div className="card-head">
        <span className="card-head-title">📌 잊지말기</span>
        <button
          type="button"
          className="mini-btn"
          onClick={() => setShow(!show)}
          disabled={busy}
        >
          + 추가
        </button>
      </div>
      <div className="pin-row">
        {pins.map((p, i) => (
          <span key={i} className={PIN_TONE[p.tone] ?? "pin"}>
            <span>{p.text}</span>
            <button
              type="button"
              className="pin-x"
              onClick={() => onDelete(i)}
              disabled={busy}
              aria-label="삭제"
            >
              ×
            </button>
          </span>
        ))}
        {pins.length === 0 && <span className="empty">아직 비어 있어요</span>}
      </div>
      {show && (
        <form
          className="mini-form"
          onSubmit={(e) => {
            e.preventDefault();
            const t = val.trim();
            if (!t) return;
            onAdd({ text: t, tone: "danger", icon: "pin" });
            setVal("");
            setShow(false);
          }}
        >
          <input
            placeholder="잊지 말 거 한 줄 (예: 6/20 영어시험)"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            autoFocus
            disabled={busy}
          />
          <button type="submit" disabled={busy}>
            추가
          </button>
        </form>
      )}
    </div>
  );
}

function Week({
  weekLabel,
  days,
  busy,
  onShift,
  onToggleChip,
}: {
  weekLabel: string;
  days: HyerinDiaryStateResponse["week"]["days"];
  busy: boolean;
  onShift: (days: number) => void;
  onToggleChip: (date: string, section: string, line: number) => void;
}) {
  return (
    <div className="card pad-mid">
      <div className="card-head">
        <span className="card-head-title">🗓 주간 다이어리</span>
        <div className="wk-nav">
          <button
            type="button"
            className="arr"
            onClick={() => onShift(-7)}
            disabled={busy}
            aria-label="이전 주"
          >
            ‹
          </button>
          <span className="wk-label">{weekLabel} 시작</span>
          <button
            type="button"
            className="arr"
            onClick={() => onShift(7)}
            disabled={busy}
            aria-label="다음 주"
          >
            ›
          </button>
        </div>
      </div>
      <div className="wk-row">
        {days.map((d) => {
          const totalChips = d.chips.length;
          const doneChips = d.chips.filter((c) => c.done).length;
          return (
            <div key={d.date} className={`wk ${d.is_today ? "today" : ""}`}>
              <div className="wk-head">
                <span className="wk-day">{d.요일}</span>
                <span className="wk-num">{Number(d.date.slice(-2))}</span>
              </div>
              {d.chips.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  className={`chip ${chipCls(c.section)} ${c.done ? "chip-done" : ""}`}
                  title={`${c.text} - 클릭하면 ${c.done ? "취소" : "완료"}`}
                  disabled={busy}
                  onClick={() => onToggleChip(d.date, c.section, c.line)}
                >
                  {c.done && <span className="chip-check">✓</span>}
                  <span>{c.text.length > 10 ? c.text.slice(0, 10) + "…" : c.text}</span>
                </button>
              ))}
              {totalChips === 0 && <span className="chip-add">비어 있음</span>}
              {totalChips > 0 && (
                <span className="wk-meta">
                  {doneChips}/{totalChips}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function chipCls(section: string): string {
  if (section === "학교") return "chip-sch";
  return "chip-gr";
}

function Section({
  title,
  emoji,
  tag,
  todos,
  busy,
  onToggle,
  onAdd,
  onDelete,
}: {
  title: string;
  emoji: string;
  tag: string;
  todos: HyerinDiaryTodo[];
  busy: boolean;
  onToggle: (line: number) => void;
  onAdd: (text: string) => void;
  onDelete: (line: number) => void;
}) {
  const [val, setVal] = useState("");
  return (
    <div className="card" style={{ flex: 1 }}>
      <h3 className="sec-title">
        <span className={`tag ${tag}`}>
          {emoji} {title}
        </span>
      </h3>
      {todos.map((t, i) => (
        <div key={i} className="todo">
          <button
            type="button"
            className={`sti ${t.done ? "sti-on" : ""}`}
            onClick={() => onToggle(i)}
            disabled={busy}
            aria-label={t.done ? "완료 해제" : "완료"}
          >
            {t.done && "✓"}
          </button>
          <span className={t.done ? "done" : ""}>{t.text}</span>
          <button
            type="button"
            className="del"
            onClick={() => onDelete(i)}
            disabled={busy}
            aria-label="삭제"
          >
            ×
          </button>
        </div>
      ))}
      <form
        className="add-form"
        onSubmit={(e) => {
          e.preventDefault();
          const t = val.trim();
          if (!t) return;
          onAdd(t);
          setVal("");
        }}
      >
        <input
          placeholder={`${title} 할 일 추가...`}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          disabled={busy}
        />
      </form>
    </div>
  );
}

function Growth({
  sections,
  busy,
  onToggle,
  onAdd,
  onDelete,
}: {
  sections: Record<string, HyerinDiaryTodo[]>;
  busy: boolean;
  onToggle: (section: string, line: number) => void;
  onAdd: (section: string, text: string) => void;
  onDelete: (section: string, line: number) => void;
}) {
  const [openKey, setOpenKey] = useState<string | null>("성장 - 글쓰기");
  const [val, setVal] = useState("");
  return (
    <div className="card" style={{ flex: 1.5 }}>
      <h3 className="sec-title">
        <span className="tag t-gr">🌱 성장</span>
      </h3>
      {GROWTH.map(({ key, label, emoji, cls }) => {
        const todos = sections[key] ?? [];
        const doneCount = todos.filter((t) => t.done).length;
        const isOpen = openKey === key;
        return (
          <div key={key} className={`growth-area ${cls}`}>
            <div
              className="growth-head"
              onClick={() => setOpenKey(isOpen ? null : key)}
            >
              <span className="growth-name">
                {emoji} {label}
              </span>
              <span className="growth-meta">
                {doneCount}/{todos.length || 0}
              </span>
              <span className="growth-chev">{isOpen ? "▴" : "▾"}</span>
            </div>
            {isOpen && (
              <div className="growth-body">
                {todos.map((t, i) => (
                  <div key={i} className="todo todo-sm">
                    <button
                      type="button"
                      className={`sti ${t.done ? "sti-on" : ""}`}
                      onClick={() => onToggle(key, i)}
                      disabled={busy}
                    >
                      {t.done && "✓"}
                    </button>
                    <span className={t.done ? "done" : ""}>{t.text}</span>
                    <button
                      type="button"
                      className="del"
                      onClick={() => onDelete(key, i)}
                      disabled={busy}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <form
                  className="add-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const t = val.trim();
                    if (!t) return;
                    onAdd(key, t);
                    setVal("");
                  }}
                >
                  <input
                    placeholder={`${label} 항목 추가...`}
                    value={openKey === key ? val : ""}
                    onChange={(e) => setVal(e.target.value)}
                    disabled={busy}
                  />
                </form>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function VideoKanban({
  video,
  busy,
  onMove,
  onAdd,
}: {
  video: Record<string, string[]>;
  busy: boolean;
  onMove: (from: string, to: string, text: string) => void;
  onAdd: (stage: string, text: string) => void;
}) {
  const [addTo, setAddTo] = useState<string | null>(null);
  const [val, setVal] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const [fromStage, ...rest] = activeId.split("|||");
    const cardText = rest.join("|||");
    if (!fromStage || !cardText) return;
    if (fromStage === overId) return;
    onMove(fromStage, overId, cardText);
  }

  return (
    <div className="card">
      <h3 className="sec-title">
        <span className="tag t-vid">🎬 영상 작업</span>
        <span className="hint">카드를 다음 칸으로 드래그 · 마지막 칸은 보관함</span>
      </h3>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="kn-row">
          {VIDEO_STAGES.map((stage, idx) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              cards={video[stage] ?? []}
              isLast={idx === VIDEO_STAGES.length - 1}
              addTo={addTo}
              setAddTo={setAddTo}
              val={val}
              setVal={setVal}
              busy={busy}
              onAdd={onAdd}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function KanbanColumn({
  stage,
  cards,
  isLast,
  addTo,
  setAddTo,
  val,
  setVal,
  busy,
  onAdd,
}: {
  stage: string;
  cards: string[];
  isLast: boolean;
  addTo: string | null;
  setAddTo: (s: string | null) => void;
  val: string;
  setVal: (s: string) => void;
  busy: boolean;
  onAdd: (stage: string, text: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={`kn ${isLast ? "kn-arch" : ""} ${isOver ? "kn-over" : ""}`}
    >
      <div className="kn-head">{stage}</div>
      {cards.map((card) => (
        <KanbanCard key={`${stage}|||${card}`} stage={stage} text={card} />
      ))}
      {addTo === stage ? (
        <form
          className="kn-add"
          onSubmit={(e) => {
            e.preventDefault();
            const t = val.trim();
            if (!t) return;
            onAdd(stage, t);
            setVal("");
            setAddTo(null);
          }}
        >
          <input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="카드"
            autoFocus
            disabled={busy}
          />
        </form>
      ) : (
        <button
          type="button"
          className="kn-plus"
          onClick={() => setAddTo(stage)}
          disabled={busy}
        >
          +
        </button>
      )}
    </div>
  );
}

function KanbanCard({ stage, text }: { stage: string; text: string }) {
  const id = `${stage}|||${text}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
  });
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="kc"
      {...listeners}
      {...attributes}
    >
      {text}
    </div>
  );
}

function DiaryNote({
  existing,
  busy,
  onAppend,
}: {
  existing: string;
  busy: boolean;
  onAppend: (text: string) => Promise<unknown>;
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const t = text.trim();
    if (!t) return;
    setSaving(true);
    try {
      await onAppend(t);
      setText("");
    } finally {
      setSaving(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  }

  return (
    <div className="card" style={{ flex: 1.5 }}>
      <h3 className="sec-title">
        <span className="tag t-note">📓 오늘의 일기</span>
        <span className="hint">저장 누르면 누적 · ⌘+Enter로 빠르게 저장</span>
      </h3>
      {existing && (
        <div className="note-prev">
          <div className="note-prev-label">오늘 적은 거</div>
          <pre className="note-prev-body">{existing}</pre>
        </div>
      )}
      <textarea
        className="note-area"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKey}
        placeholder="오늘 학교에서, 책 읽으면서, 머릿속에 떠오른 거... 아무거나 적어."
        rows={3}
      />
      <div className="note-actions">
        <button
          type="button"
          className="save-btn"
          onClick={handleSave}
          disabled={busy || saving || !text.trim()}
        >
          {saving ? "저장 중..." : "💾 저장"}
        </button>
      </div>
    </div>
  );
}

function Routine({
  def,
  done,
  busy,
  onToggle,
  onAddDef,
  onDeleteDef,
}: {
  def: string[];
  done: string[];
  busy: boolean;
  onToggle: (item: string) => void;
  onAddDef: (item: string) => void;
  onDeleteDef: (item: string) => void;
}) {
  const [val, setVal] = useState("");
  return (
    <div className="card" style={{ flex: 1 }}>
      <h3 className="sec-title">
        <span className="tag t-rou">✨ 매일 루틴</span>
        <span className="hint">매일 하기</span>
      </h3>
      {def.map((item) => {
        const isDone = done.includes(item);
        return (
          <div key={item} className="todo">
            <button
              type="button"
              className={`sti sti-heart ${isDone ? "sti-on" : ""}`}
              onClick={() => onToggle(item)}
              disabled={busy}
            >
              {isDone && "✓"}
            </button>
            <span className={isDone ? "done" : ""}>{item}</span>
            <button
              type="button"
              className="del"
              onClick={() => onDeleteDef(item)}
              disabled={busy}
              aria-label="루틴 삭제"
            >
              ×
            </button>
          </div>
        );
      })}
      <form
        className="add-form"
        onSubmit={(e) => {
          e.preventDefault();
          const t = val.trim();
          if (!t) return;
          onAddDef(t);
          setVal("");
        }}
      >
        <input
          placeholder="새 루틴 (예: 물 2잔)"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          disabled={busy}
        />
      </form>
    </div>
  );
}

function SeedsBox({
  seeds,
  seedsTotal,
  busy,
  onAdd,
}: {
  seeds: string[];
  seedsTotal: number;
  busy: boolean;
  onAdd: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const t = text.trim();
    if (!t) return;
    setSaving(true);
    try {
      await onAdd(t);
      setText("");
    } finally {
      setSaving(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  }

  return (
    <div className="card">
      <h3 className="sec-title">
        <span className="tag t-seed">🌱 이야기 씨앗</span>
        <span className="hint">
          {seedsTotal}개 누적 · 떠오르는 대로 길게 써도 OK · ⌘+Enter
        </span>
      </h3>
      {seeds.length > 0 && (
        <div className="seed-list">
          {seeds.slice(-5).reverse().map((s, i) => (
            <div key={i} className="seed-item">
              · {s}
            </div>
          ))}
          {seedsTotal > 5 && (
            <div className="seed-more">… 그 외 {seedsTotal - 5}개</div>
          )}
        </div>
      )}
      <textarea
        className="seed-area"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKey}
        placeholder="거짓말하면 머리색 바뀌는 학교... 어떤 아이디어든 좋아."
        rows={3}
      />
      <div className="note-actions">
        <button
          type="button"
          className="save-btn save-seed"
          onClick={handleSave}
          disabled={busy || saving || !text.trim()}
        >
          {saving ? "저장 중..." : "🌱 씨앗 추가"}
        </button>
      </div>
    </div>
  );
}

const CSS = `
  .diary-root {
    --d-bg: #FAF6F0;
    --d-card: #FFFFFF;
    --d-soft: #F7F0E5;
    --d-border: #EFE5DA;
    --d-text: #3A2F2A;
    --d-sub: #8B7D75;
    --d-amber: #D4A04F;
    --d-amber-soft: #FAEEDA;
    --d-amber-dk: #633806;
    --d-coral: #E89B7C;
    --d-coral-soft: #FAECE7;
    --d-coral-dk: #712B13;
    --d-purple-soft: #EEEDFE;
    --d-purple-dk: #3C3489;
    --d-teal-soft: #E1F5EE;
    --d-teal-dk: #085041;
    --d-green-soft: #EAF3DE;
    --d-green-dk: #27500A;
    --d-pink-soft: #FBEAF0;
    --d-pink-dk: #993556;
    --d-blue-soft: #E6F1FB;
    --d-blue-dk: #0C447C;
    --d-red-soft: #FCEBEB;
    --d-red-dk: #791F1F;

    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    background: var(--d-bg);
    border-radius: 12px;
    padding: 0.9rem;
    color: var(--d-text);
    font-family: ui-sans-serif, system-ui, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
  }
  .diary-root * { box-sizing: border-box; }
  .row { display: flex; gap: 0.5rem; align-items: stretch; }
  .two-col > * { min-width: 0; }
  .card { background: var(--d-card); border: 1px solid var(--d-border); border-radius: 12px; padding: 0.75rem 0.9rem; min-width: 0; }
  .pad-tight { padding: 0.55rem 0.8rem; }
  .pad-mid { padding: 0.65rem 0.85rem; }

  .hdr { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
  .hdr h1 { margin: 0; font-size: 18px; font-weight: 700; }
  .hdr p { margin: 2px 0 0; font-size: 11px; color: var(--d-sub); }

  .metric { display: flex; align-items: center; gap: 7px; padding: 7px 11px; border-radius: 10px; background: var(--d-card); border: 1px solid var(--d-border); font-size: 11px; flex: 1; min-width: 0; }
  .metric-sm { flex: 0.7; }
  .metric.amber { background: var(--d-amber-soft); border-color: var(--d-amber); }
  .metric .lbl { color: var(--d-sub); font-size: 10px; white-space: nowrap; }
  .metric .num { font-size: 15px; font-weight: 700; color: var(--d-amber-dk); }
  .metric .num-md { font-size: 14px; }
  .metric .unit { font-size: 10px; color: var(--d-sub); }
  .metric .muted { font-size: 10px; color: var(--d-sub); white-space: nowrap; }
  .metric .strong { color: var(--d-amber-dk); font-weight: 600; }
  .bar { flex: 1; height: 6px; background: var(--d-border); border-radius: 3px; overflow: hidden; margin: 0 6px; min-width: 30px; }
  .bar .fill { height: 100%; background: var(--d-amber); border-radius: 3px; transition: width 0.3s; }

  .card-head { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
  .card-head-title { font-size: 12px; font-weight: 600; }
  .pin-row { display: flex; gap: 6px; flex-wrap: wrap; }
  .pin { display: inline-flex; align-items: center; gap: 6px; background: var(--d-red-soft); border: 1px solid #F09595; color: var(--d-red-dk); border-radius: 999px; padding: 2px 4px 2px 10px; font-size: 11px; font-weight: 500; }
  .pin.calm { background: var(--d-amber-soft); border-color: var(--d-amber); color: #854F0B; }
  .pin.info { background: var(--d-blue-soft); border-color: #B5D4F4; color: var(--d-blue-dk); }
  .pin-x { background: rgba(255,255,255,0.6); border: none; border-radius: 50%; width: 16px; height: 16px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; color: inherit; cursor: pointer; font-family: inherit; line-height: 1; padding: 0; }
  .pin-x:hover:not(:disabled) { background: rgba(255,255,255,1); }
  .empty { font-size: 11px; color: var(--d-sub); padding: 4px 8px; }
  .mini-btn { background: transparent; border: 1px dashed var(--d-border); border-radius: 999px; padding: 2px 10px; font-size: 11px; color: var(--d-sub); cursor: pointer; margin-left: auto; font-family: inherit; }
  .mini-btn:hover:not(:disabled) { background: var(--d-soft); }
  .mini-form { display: flex; gap: 4px; margin-top: 6px; }
  .mini-form input { flex: 1; padding: 5px 9px; border: 1px solid var(--d-border); border-radius: 6px; font-size: 12px; font-family: inherit; }
  .mini-form button { padding: 5px 12px; border: 1px solid var(--d-coral); background: var(--d-coral); color: white; border-radius: 6px; font-size: 11px; cursor: pointer; font-family: inherit; }

  /* Week */
  .wk-nav { margin-left: auto; display: flex; align-items: center; gap: 8px; }
  .arr { width: 24px; height: 24px; border-radius: 6px; background: var(--d-soft); border: 1px solid var(--d-border); color: var(--d-sub); cursor: pointer; font-size: 14px; font-family: inherit; padding: 0; }
  .arr:hover:not(:disabled) { background: var(--d-amber-soft); border-color: var(--d-amber); color: var(--d-amber-dk); }
  .wk-label { font-size: 11px; color: var(--d-sub); font-weight: 500; }
  .wk-row { display: flex; gap: 5px; }
  .wk { flex: 1; min-width: 0; border-radius: 10px; background: var(--d-soft); border: 1px solid var(--d-border); padding: 8px 6px; display: flex; flex-direction: column; gap: 4px; min-height: 130px; }
  .wk.today { background: var(--d-amber-soft); border-color: var(--d-amber); }
  .wk-head { display: flex; justify-content: space-between; align-items: baseline; }
  .wk-day { font-size: 10px; color: var(--d-sub); }
  .wk-num { font-size: 14px; font-weight: 600; }
  .wk.today .wk-day, .wk.today .wk-num { color: var(--d-amber-dk); }
  .chip { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; padding: 2px 6px; border-radius: 5px; background: var(--d-card); border: 1px solid var(--d-border); line-height: 1.3; cursor: pointer; font-family: inherit; text-align: left; }
  .chip:hover:not(:disabled) { box-shadow: 0 0 0 1px var(--d-amber); }
  .chip-check { font-weight: 700; }
  .chip-sch { background: var(--d-blue-soft); border-color: #B5D4F4; color: var(--d-blue-dk); }
  .chip-gr { background: var(--d-green-soft); border-color: #C0DD97; color: var(--d-green-dk); }
  .chip-done { background: rgba(192,221,151,0.5); text-decoration: line-through; opacity: 0.7; }
  .chip-add { font-size: 10px; color: var(--d-sub); border: 1px dashed var(--d-border); border-radius: 5px; padding: 2px 6px; text-align: center; }
  .wk-meta { font-size: 10px; color: var(--d-sub); text-align: right; margin-top: auto; font-weight: 500; }

  /* Sections */
  .sec-title { margin: 0 0 6px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .tag { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; padding: 3px 11px; border-radius: 999px; }
  .t-sch { background: #B5D4F4; color: var(--d-blue-dk); }
  .t-gr { background: #C0DD97; color: var(--d-green-dk); }
  .t-vid { background: #5DCAA5; color: var(--d-teal-dk); }
  .t-note { background: var(--d-amber); color: white; }
  .t-rou { background: #ED93B1; color: white; }
  .t-seed { background: #F5C4B3; color: var(--d-coral-dk); }
  .hint { font-size: 10px; color: var(--d-sub); font-weight: 400; }

  .todo { display: flex; align-items: center; gap: 8px; padding: 5px 0; font-size: 12px; border-bottom: 1px dashed var(--d-border); }
  .todo:last-child { border-bottom: none; }
  .todo-sm { padding: 3px 0; font-size: 11px; }
  .todo .done { text-decoration: line-through; color: var(--d-sub); flex: 1; }
  .todo > span:not(.done) { flex: 1; }
  .sti { width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; background: var(--d-soft); border: 1.5px solid var(--d-border); cursor: pointer; font-family: inherit; padding: 0; font-weight: 700; }
  .sti.sti-on { background: #C0DD97; color: var(--d-green-dk); border-color: #97C459; }
  .sti.sti-heart { background: var(--d-pink-soft); border-color: #ED93B1; }
  .sti.sti-heart.sti-on { background: #F4C0D1; color: var(--d-pink-dk); border-color: #ED93B1; }
  .del { background: transparent; border: none; color: var(--d-sub); font-size: 16px; cursor: pointer; padding: 0 4px; font-family: inherit; line-height: 1; }
  .del:hover:not(:disabled) { color: var(--d-red-dk); }
  .add-form { padding: 6px 0 0; }
  .add-form input { width: 100%; padding: 6px 10px; border: 1px dashed var(--d-border); border-radius: 6px; font-size: 12px; background: var(--d-soft); font-family: inherit; }
  .add-form input:focus { outline: none; border-color: var(--d-coral); background: var(--d-card); }

  /* Growth */
  .growth-area { background: var(--d-soft); border-radius: 8px; margin-bottom: 4px; overflow: hidden; }
  .growth-area.c-write { background: var(--d-coral-soft); }
  .growth-area.c-eng { background: var(--d-purple-soft); }
  .growth-area.c-vid { background: var(--d-teal-soft); }
  .growth-area.c-book { background: var(--d-amber-soft); }
  .growth-area.c-run { background: var(--d-green-soft); }
  .growth-head { display: flex; align-items: center; gap: 7px; padding: 7px 11px; font-size: 12px; cursor: pointer; }
  .growth-name { font-weight: 600; flex: 1; }
  .growth-meta { font-size: 10px; opacity: 0.75; }
  .growth-chev { font-size: 10px; opacity: 0.6; }
  .c-write .growth-name, .c-write .growth-meta { color: var(--d-coral-dk); }
  .c-eng .growth-name, .c-eng .growth-meta { color: var(--d-purple-dk); }
  .c-vid .growth-name, .c-vid .growth-meta { color: var(--d-teal-dk); }
  .c-book .growth-name, .c-book .growth-meta { color: var(--d-amber-dk); }
  .c-run .growth-name, .c-run .growth-meta { color: var(--d-green-dk); }
  .growth-body { padding: 4px 11px 8px; background: rgba(255,255,255,0.5); }

  /* Kanban */
  .kn-row { display: flex; gap: 4px; }
  .kn { flex: 1; min-width: 0; background: var(--d-soft); border-radius: 8px; padding: 8px 6px; min-height: 110px; transition: background 0.15s, border-color 0.15s; border: 2px dashed transparent; }
  .kn-arch { background: var(--d-border); opacity: 0.85; }
  .kn-over { background: #FFF8EC; border-color: var(--d-amber); }
  .kn-head { font-size: 10px; font-weight: 600; color: var(--d-sub); text-align: center; margin-bottom: 6px; }
  .kc { background: var(--d-card); border: 1px solid var(--d-border); border-radius: 6px; padding: 6px 8px; font-size: 11px; margin-bottom: 4px; line-height: 1.3; touch-action: none; user-select: none; }
  .kc:hover { border-color: var(--d-teal-dk); background: #F0FAF6; }
  .kn-plus { width: 100%; padding: 3px; background: transparent; border: 1px dashed var(--d-border); border-radius: 6px; color: var(--d-sub); cursor: pointer; font-size: 12px; font-family: inherit; }
  .kn-plus:hover:not(:disabled) { background: rgba(255,255,255,0.6); color: var(--d-text); }
  .kn-add input { width: 100%; padding: 4px 6px; border: 1px solid var(--d-teal-dk); border-radius: 6px; font-size: 11px; font-family: inherit; }

  /* Diary note */
  .note-prev { background: var(--d-amber-soft); border: 1px solid var(--d-amber); border-radius: 8px; padding: 8px 10px; margin-bottom: 6px; }
  .note-prev-label { font-size: 10px; color: var(--d-amber-dk); font-weight: 600; margin-bottom: 4px; }
  .note-prev-body { margin: 0; font-size: 11px; line-height: 1.6; color: var(--d-amber-dk); white-space: pre-wrap; font-family: inherit; max-height: 120px; overflow-y: auto; }
  .note-area { width: 100%; min-height: 70px; resize: vertical; background: #FFFBF1; border: 1px solid var(--d-border); border-radius: 8px; padding: 9px 11px; font-size: 12px; line-height: 1.55; color: var(--d-text); font-family: inherit; }
  .note-area:focus { outline: none; border-color: var(--d-coral); }
  .note-area::placeholder { color: var(--d-sub); }
  .note-actions { display: flex; justify-content: flex-end; margin-top: 6px; }
  .save-btn { padding: 7px 16px; background: var(--d-amber); border: none; color: white; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
  .save-btn:hover:not(:disabled) { background: var(--d-amber-dk); }
  .save-btn:disabled { background: var(--d-border); color: var(--d-sub); cursor: not-allowed; }
  .save-seed { background: var(--d-coral); }
  .save-seed:hover:not(:disabled) { background: var(--d-coral-dk); }

  /* Seeds */
  .seed-list { background: var(--d-coral-soft); border-radius: 8px; padding: 8px 12px; margin-bottom: 6px; max-height: 110px; overflow-y: auto; }
  .seed-item { font-size: 11px; line-height: 1.6; color: var(--d-coral-dk); }
  .seed-more { font-size: 10px; color: var(--d-sub); margin-top: 4px; font-style: italic; }
  .seed-area { width: 100%; min-height: 70px; resize: vertical; background: #FFF8F4; border: 1px solid #F5C4B3; border-radius: 8px; padding: 9px 11px; font-size: 12px; line-height: 1.55; color: var(--d-coral-dk); font-family: inherit; }
  .seed-area:focus { outline: none; border-color: var(--d-coral); }
  .seed-area::placeholder { color: #D85A30; opacity: 0.55; }
`;
