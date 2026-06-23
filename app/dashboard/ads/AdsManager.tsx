"use client";

import { useState } from "react";
import Link from "next/link";
import { callApi, fmtWon, fmtMonthDay, CONTACT_CHANNELS } from "@/lib/dashboard-client";
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

interface AdItem {
  type: string;
  audience: string;
  brand: string;
  product: string;
  label: string;
  state: string;
  states: string[];
  upload_deadline: string | null;
  payment_date: string | null;
  amount_raw: string | null;
  amount_won: number | null;
  kpi: string | null;
  담당자: string | null;
  소통_채널: string | null;
  자동DM: string | null;
  "2차활용": string | null;
  특이사항: string | null;
  file: string;
}

interface AdsData {
  items: AdItem[];
  total: number;
  total_amount_won: number;
  unpaid_count: number;
  unpaid_amount_won: number;
}

const DEFAULT_STATES = ["제안", "협의", "계약", "제품수령", "콘텐츠", "업로드", "입금완료"];

export default function AdsManager({ initial }: { initial: AdsData }) {
  const [data, setData] = useState<AdsData>(initial);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setData(await callApi<AdsData>("GET", "ads-detail"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "새로고침 실패");
    }
  }

  const items = data?.items || [];
  const active = items.filter((i) => i.state !== "입금완료" && i.state !== "종료");
  const done = items.filter((i) => i.state === "입금완료" || i.state === "종료");

  return (
    <main className="dashboard-root min-h-screen bg-paper text-ink">
      <header className="max-w-page mx-auto px-5 sm:px-8 py-6 border-b border-rule">
        <Link href="/dashboard" className="text-xs text-muted hover:opacity-70">
          ← 대시보드
        </Link>
        <div className="flex items-center justify-between mt-2 flex-wrap gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">광고</h1>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="text-sm px-4 py-2 rounded-lg font-medium transition"
            style={{
              backgroundColor: showForm ? "var(--bg-card-soft)" : "var(--accent)",
              color: showForm ? "var(--text-main)" : "#fff",
              border: "1px solid var(--accent)",
            }}
          >
            {showForm ? "닫기" : "+ 새 광고"}
          </button>
        </div>
        <div className="flex gap-6 mt-2 text-sm flex-wrap">
          <span>
            <span className="text-muted">전체 </span>
            <span className="font-medium">{data.total}건</span>
          </span>
          <span>
            <span className="text-muted">미입금 </span>
            <span className="font-medium" style={{ color: "var(--danger)" }}>
              {fmtWon(data.unpaid_amount_won)} ({data.unpaid_count}건)
            </span>
          </span>
          <span>
            <span className="text-muted">총액 </span>
            <span className="font-medium">{fmtWon(data.total_amount_won)}</span>
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
          <AdCreateForm
            busy={busy}
            onSubmit={async (payload) => {
              setBusy(true);
              setError(null);
              try {
                await callApi("POST", "ad", payload);
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
              <AdCard key={it.file} item={it} onChanged={refresh} setError={setError} />
            ))}
            {active.length === 0 && <p className="text-sm text-muted">진행 중 광고 없음</p>}
          </div>
        </section>

        {done.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold mb-3 text-muted">완료 ({done.length})</h2>
            <div className="space-y-2">
              {done.map((it) => (
                <AdCard key={it.file} item={it} onChanged={refresh} setError={setError} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────

interface AdCreatePayload {
  audience: string;
  brand: string;
  product: string;
  fields: Record<string, string>;
  note: string;
}

function AdCreateForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (p: AdCreatePayload) => void;
}) {
  const [audience, setAudience] = useState("한나");
  const [brand, setBrand] = useState("");
  const [product, setProduct] = useState("");
  const [upload, setUpload] = useState("");
  const [cost, setCost] = useState("");
  const [reuse, setReuse] = useState("");
  const [payment, setPayment] = useState("");
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
      <h3 className="font-semibold text-base">새 광고 만들기</h3>

      <Toggle label="대상" value={audience} options={["한나", "혜린"]} onChange={setAudience} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="이름(브랜드) *" value={brand} onChange={setBrand} placeholder="예: OO브랜드" />
        <Field label="제품" value={product} onChange={setProduct} placeholder="상품명" />
        <Field label="업로드 마감일" type="date" value={upload} onChange={setUpload} />
        <Field label="광고비" value={cost} onChange={setCost} placeholder="예: 1,000,000원" />
        <Field label="입금 예정일" type="date" value={payment} onChange={setPayment} />
        <Field label="2차활용" value={reuse} onChange={setReuse} placeholder="기간 / 범위 / 비용" />
        <Field label="담당자" value={manager} onChange={setManager} placeholder="담당자 이름" />
        <SelectField label="연락망" value={channel} options={[...CONTACT_CHANNELS]} onChange={setChannel} />
      </div>

      <Field
        label="목표(KPI) — 그쪽이 원하는 것"
        value={kpi}
        onChange={setKpi}
        placeholder="예: 바이럴(노출) / 전환(구매·DB) — 자유롭게"
      />

      <Toggle
        label="자동 DM 발송"
        value={autoDm ? "할거임" : "안함"}
        options={["할거임", "안함"]}
        onChange={(v) => setAutoDm(v === "할거임")}
      />

      <Textarea label="요청사항 / 특이사항" value={note} onChange={setNote} placeholder="브랜드 요청사항, 주의점 등" />

      <button
        disabled={!canSubmit}
        onClick={() =>
          onSubmit({
            audience,
            brand: brand.trim(),
            product: product.trim(),
            fields: cleanFields({
              광고비: cost,
              업로드_마감: upload,
              입금_예정: payment,
              "2차활용": reuse,
              담당자: manager,
              소통_채널: channel,
              목표_KPI: kpi,
              자동DM: autoDm ? "함" : "안함",
              특이사항: note,
            }),
            note: note.trim(),
          })
        }
        className="w-full py-2.5 rounded-lg font-medium text-sm transition disabled:opacity-40"
        style={{ backgroundColor: "var(--accent)", color: "#fff" }}
      >
        {busy ? "만드는 중…" : "광고 만들기"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────

function AdCard({
  item,
  onChanged,
  setError,
}: {
  item: AdItem;
  onChanged: () => void;
  setError: (s: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const states = item.states?.length ? item.states : DEFAULT_STATES;
  const unpaid = item.state !== "입금완료" && item.amount_won;

  const [kpi, setKpi] = useState(item.kpi || "");
  const [manager, setManager] = useState(item.담당자 || "");
  const [channel, setChannel] = useState(item.소통_채널 || "카톡");
  const [cost, setCost] = useState(item.amount_raw || "");
  const [payment, setPayment] = useState(item.payment_date || "");
  const [note, setNote] = useState(item.특이사항 || "");

  async function changeState(newState: string) {
    setBusy(true);
    setError(null);
    try {
      await callApi("PATCH", `ad/${encodeURIComponent(item.file)}/state`, { state: newState });
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
      await callApi("PATCH", `ad/${encodeURIComponent(item.file)}`, {
        fields: cleanFields({
          목표_KPI: kpi,
          담당자: manager,
          소통_채널: channel,
          광고비: cost,
          입금_예정: payment,
          특이사항: note,
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
        <span className="font-medium text-base flex-1 min-w-[140px]">{item.label}</span>
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
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <Info label="업로드" value={fmtMonthDay(item.upload_deadline)} />
            <Info
              label="입금"
              value={fmtMonthDay(item.payment_date)}
              accent={false}
            />
            <Info label="광고비" value={fmtWon(item.amount_won) || item.amount_raw || "—"} accent />
            <Info label="입금상태" value={unpaid ? "미입금" : item.state === "입금완료" ? "완료" : "—"} />
          </div>
          {(item.담당자 || item.소통_채널 || item.특이사항) && (
            <p className="text-xs text-muted mt-2">
              {item.담당자 && <span>담당 {item.담당자}</span>}
              {item.담당자 && item.소통_채널 && " · "}
              {item.소통_채널 && <span>{item.소통_채널}</span>}
              {item.특이사항 && <span className="block mt-1">📝 {item.특이사항}</span>}
            </p>
          )}
        </>
      ) : (
        <div className="space-y-3 pt-1">
          <Field label="목표(KPI)" value={kpi} onChange={setKpi} placeholder="자유롭게" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="담당자" value={manager} onChange={setManager} />
            <SelectField label="연락망" value={channel} options={[...CONTACT_CHANNELS]} onChange={setChannel} />
            <Field label="광고비" value={cost} onChange={setCost} />
            <Field label="입금 예정일" type="date" value={payment} onChange={setPayment} />
          </div>
          <Textarea label="특이사항" value={note} onChange={setNote} />
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
    </div>
  );
}
