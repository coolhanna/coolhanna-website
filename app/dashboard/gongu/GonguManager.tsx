"use client";

import { useState } from "react";
import Link from "next/link";
import {
  callApi,
  fmtWon,
  fmtMonthDay,
  CONTACT_CHANNELS,
} from "@/lib/dashboard-client";
import {
  cleanFields,
  AudienceBadge,
  StateSelect,
  Info,
  Field,
  SelectField,
  Toggle,
  Textarea,
} from "@/app/dashboard/components/card-ui";

interface GonguItem {
  type: string;
  audience: string;
  brand: string;
  state: string;
  states: string[];
  open_date: string | null;
  close_date: string | null;
  reels: string;
  shorts: string;
  수수료_퍼센트: string | null;
  실_매출: string | null;
  실_매출_원: number | null;
  공구가: string | null;
  kpi: string | null;
  담당자: string | null;
  소통_채널: string | null;
  자동DM: string | null;
  입금_예정일: string | null;
  file: string;
}

interface GonguData {
  items: GonguItem[];
  total: number;
  total_sales_won: number;
}

const DEFAULT_STATES = [
  "제안", "검토", "계약", "제품수령", "콘텐츠준비",
  "오픈전", "진행중", "마감", "매출확인", "입금완료",
];

export default function GonguManager({ initial }: { initial: GonguData }) {
  const [data, setData] = useState<GonguData>(initial);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const fresh = await callApi<GonguData>("GET", "gongu-detail");
      setData(fresh);
    } catch (e) {
      setError(e instanceof Error ? e.message : "새로고침 실패");
    }
  }

  const items = data?.items || [];
  const active = items.filter((i) => i.state !== "입금완료");
  const done = items.filter((i) => i.state === "입금완료");

  return (
    <main className="dashboard-root min-h-screen bg-paper text-ink">
      <header className="max-w-page mx-auto px-5 sm:px-8 py-6 border-b border-rule">
        <Link href="/dashboard" className="text-xs text-muted hover:opacity-70">
          ← 대시보드
        </Link>
        <div className="flex items-center justify-between mt-2 flex-wrap gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">공구</h1>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="text-sm px-4 py-2 rounded-lg font-medium transition"
            style={{
              backgroundColor: showForm ? "var(--bg-card-soft)" : "var(--accent)",
              color: showForm ? "var(--text-main)" : "#fff",
              border: "1px solid var(--accent)",
            }}
          >
            {showForm ? "닫기" : "+ 새 공구"}
          </button>
        </div>
        <div className="flex gap-6 mt-2 text-sm">
          <span>
            <span className="text-muted">진행 </span>
            <span className="font-medium">{active.length}건</span>
          </span>
          <span>
            <span className="text-muted">총 매출 </span>
            <span className="font-medium" style={{ color: "var(--accent)" }}>
              {fmtWon(data.total_sales_won)}
            </span>
          </span>
        </div>
      </header>

      <div className="max-w-page mx-auto px-5 sm:px-8 py-6 space-y-6">
        {error && (
          <p className="text-sm" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}

        {showForm && (
          <GonguCreateForm
            busy={busy}
            onSubmit={async (payload) => {
              setBusy(true);
              setError(null);
              try {
                await callApi("POST", "gongu", payload);
                await refresh();
                setShowForm(false);
              } catch (e) {
                setError(e instanceof Error ? e.message : "생성 실패");
              } finally {
                setBusy(false);
              }
            }}
          />
        )}

        <section>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--accent)" }}>
            진행 중 ({active.length})
          </h2>
          <div className="space-y-2">
            {active.map((it) => (
              <GonguCard key={it.file} item={it} onChanged={refresh} setError={setError} />
            ))}
            {active.length === 0 && <p className="text-sm text-muted">진행 중 공구 없음</p>}
          </div>
        </section>

        {done.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold mb-3 text-muted">완료 ({done.length})</h2>
            <div className="space-y-2">
              {done.map((it) => (
                <GonguCard key={it.file} item={it} onChanged={refresh} setError={setError} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────

interface CreatePayload {
  audience: string;
  brand: string;
  product: string;
  open_date: string | null;
  close_date: string | null;
  fields: Record<string, string>;
  note: string;
}

function GonguCreateForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (p: CreatePayload) => void;
}) {
  const [audience, setAudience] = useState("한나");
  const [brand, setBrand] = useState("");
  const [product, setProduct] = useState("");
  const [openDate, setOpenDate] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [price, setPrice] = useState("");
  const [fee, setFee] = useState("");
  const [manager, setManager] = useState("");
  const [channel, setChannel] = useState("카톡");
  const [kpi, setKpi] = useState("");
  const [autoDm, setAutoDm] = useState(true);
  const [note, setNote] = useState("");

  const canSubmit = brand.trim().length > 0 && !busy;

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{ border: "1px solid var(--border-strong)", backgroundColor: "var(--bg-card)" }}
    >
      <h3 className="font-semibold text-base">새 공구 만들기</h3>

      <Toggle label="대상" value={audience} options={["한나", "혜린"]} onChange={setAudience} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="이름(브랜드) *" value={brand} onChange={setBrand} placeholder="예: 키영양제" />
        <Field label="제품" value={product} onChange={setProduct} placeholder="상품명" />
        <Field label="오픈일" type="date" value={openDate} onChange={setOpenDate} />
        <Field label="마감일" type="date" value={closeDate} onChange={setCloseDate} />
        <Field label="공구가" value={price} onChange={setPrice} placeholder="예: 29,900원" />
        <Field label="수수료 %" value={fee} onChange={setFee} placeholder="예: 15%" />
        <Field label="담당자" value={manager} onChange={setManager} placeholder="담당자 이름" />
        <SelectField label="연락망" value={channel} options={[...CONTACT_CHANNELS]} onChange={setChannel} />
      </div>

      <Field
        label="목표(KPI) — 그쪽이 원하는 것"
        value={kpi}
        onChange={setKpi}
        placeholder="예: 매출 / 조회수 터뜨리기 / 쿠폰 전환 — 자유롭게"
      />

      <Toggle
        label="자동 DM 발송"
        value={autoDm ? "할거임" : "안함"}
        options={["할거임", "안함"]}
        onChange={(v) => setAutoDm(v === "할거임")}
      />

      <Textarea
        label="요청사항 / 메모"
        value={note}
        onChange={setNote}
        placeholder="브랜드 요청사항, 주의점 등"
      />

      <button
        disabled={!canSubmit}
        onClick={() =>
          onSubmit({
            audience,
            brand: brand.trim(),
            product: product.trim(),
            open_date: openDate || null,
            close_date: closeDate || null,
            fields: cleanFields({
              공구가: price,
              수수료_퍼센트: fee,
              업체담당자: manager,
              소통_채널: channel,
              목표_KPI: kpi,
              자동DM_세팅: autoDm ? "true" : "",
            }),
            note: note.trim(),
          })
        }
        className="w-full py-2.5 rounded-lg font-medium text-sm transition disabled:opacity-40"
        style={{ backgroundColor: "var(--accent)", color: "#fff" }}
      >
        {busy ? "만드는 중…" : "공구 만들기"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────

function GonguCard({
  item,
  onChanged,
  setError,
}: {
  item: GonguItem;
  onChanged: () => void;
  setError: (s: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const states = item.states?.length ? item.states : DEFAULT_STATES;

  const [kpi, setKpi] = useState(item.kpi || "");
  const [manager, setManager] = useState(item.담당자 || "");
  const [channel, setChannel] = useState(item.소통_채널 || "카톡");
  const [price, setPrice] = useState(item.공구가 || "");
  const [sales, setSales] = useState(item.실_매출 || "");

  async function changeState(newState: string) {
    setBusy(true);
    setError(null);
    try {
      await callApi("PATCH", `gongu/${encodeURIComponent(item.file)}/state`, { state: newState });
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "상태 변경 실패");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdits() {
    setBusy(true);
    setError(null);
    try {
      await callApi("PATCH", `gongu/${encodeURIComponent(item.file)}`, {
        fields: cleanFields({
          목표_KPI: kpi,
          업체담당자: manager,
          소통_채널: channel,
          공구가: price,
          실_매출: sales,
        }),
      });
      onChanged();
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "수정 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="rounded-lg p-4"
      style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}
    >
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <AudienceBadge audience={item.audience} />
        <span className="font-medium text-base flex-1 min-w-[140px]">{item.brand}</span>
        <StateSelect value={item.state} options={states} disabled={busy} onChange={changeState} />
        <button
          onClick={() => setEditing((v) => !v)}
          className="text-xs px-2.5 py-1 rounded-md transition"
          style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          {editing ? "취소" : "수정"}
        </button>
      </div>

      {item.kpi && !editing && (
        <p className="text-xs mb-2">
          <span
            className="px-2 py-0.5 rounded-md"
            style={{ backgroundColor: "var(--secondary-soft)", color: "var(--secondary-text)" }}
          >
            🎯 {item.kpi}
          </span>
        </p>
      )}

      {!editing ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <Info label="오픈" value={fmtMonthDay(item.open_date)} />
          <Info label="마감" value={fmtMonthDay(item.close_date)} />
          <Info label="콘텐츠" value={`릴스 ${item.reels} · 숏 ${item.shorts}`} />
          <Info
            label="실 매출"
            value={fmtWon(item.실_매출_원) || item.실_매출 || "—"}
            accent
          />
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          <Field label="목표(KPI)" value={kpi} onChange={setKpi} placeholder="자유롭게" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="담당자" value={manager} onChange={setManager} />
            <SelectField label="연락망" value={channel} options={[...CONTACT_CHANNELS]} onChange={setChannel} />
            <Field label="공구가" value={price} onChange={setPrice} />
            <Field label="실 매출" value={sales} onChange={setSales} placeholder="예: 1,200,000원" />
          </div>
          <button
            disabled={busy}
            onClick={saveEdits}
            className="w-full py-2 rounded-lg font-medium text-sm transition disabled:opacity-40"
            style={{ backgroundColor: "var(--accent)", color: "#fff" }}
          >
            {busy ? "저장 중…" : "저장"}
          </button>
        </div>
      )}

      {(item.담당자 || item.소통_채널) && !editing && (
        <p className="text-xs text-muted mt-2">
          {item.담당자 && <span>담당 {item.담당자}</span>}
          {item.담당자 && item.소통_채널 && " · "}
          {item.소통_채널 && <span>{item.소통_채널}</span>}
        </p>
      )}
    </div>
  );
}

