"use client";

// 연결 그림 — "누가 누구에게 어떤 파일을 넘기나"를 눈으로 본다.
//
// 한나 2026-08-29: "서로가 서로를 어떻게 보고 있고 어떻게 연결이 되는지,
// 서로 파일을 주고 봤는지를 봐야 돼."
//
// 목록으로는 안 보인다. 왼쪽=원자료, 오른쪽=한나가 보는 것. 화살표가 파일 이동이고,
// 노드를 누르면 그 노드가 주고받는 파일만 남기고 나머지는 흐려진다.

import { useMemo, useState } from "react";

export interface GraphNode {
  id: string;
  label: string;
  /** 명찰용 2~5글자 한글 역할명. 긴 label은 설명용. */
  short?: string;
  layer: number;
  row: number;
  status: "돌음" | "조용" | "멈춤" | "도달";
  manual: boolean;
  last_output: string | null;
  note: string;
  /** ops_monitor 판정 — ok/late/silent/down/idle/stopped/unknown. 쓰러짐 표현에 쓴다. */
  alarm?: string;
  reason?: string;
  /** 1 핵심(사슬) · 2 정기 · 3 대기 — 공간을 나누는 기준 */
  tier?: number;
  /** 누적 실행 횟수. 등급의 재료. */
  xp?: number;
}

export interface GraphLink {
  from: string;
  to: string;
  files: string[];
  dead: boolean;
}

export interface OpsGraph {
  nodes?: GraphNode[];
  links?: GraphLink[];
  columns?: number;
}

const COL_W = 260;   // 열 간격
const ROW_H = 62;    // 행 간격
const BOX_W = 186;
const BOX_H = 44;
const PAD = 18;

const FILL: Record<GraphNode["status"], { bg: string; border: string; text: string }> = {
  돌음: { bg: "var(--accent-soft)", border: "var(--accent)", text: "var(--accent-text)" },
  조용: { bg: "var(--secondary-soft)", border: "var(--secondary)", text: "var(--secondary-text)" },
  멈춤: { bg: "var(--danger-soft)", border: "var(--danger)", text: "var(--danger-text)" },
  도달: { bg: "var(--bg-card-soft)", border: "var(--border-strong)", text: "var(--text-main)" },
};

const COLUMN_TITLE = ["원자료 · 수집", "가공 · 판단", "한나가 보는 것"];

/** 파일 경로에서 사람이 알아볼 마지막 두 조각만 */
function fileTag(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts.slice(-2).join("/");
}

export default function FlowGraphView({ graph }: { graph: OpsGraph }) {
  const nodes = graph.nodes ?? [];
  const links = graph.links ?? [];
  const [picked, setPicked] = useState<string | null>(null);

  const place = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    nodes.forEach((n) => {
      map.set(n.id, {
        x: PAD + n.layer * COL_W,
        y: PAD + 26 + n.row * ROW_H,
      });
    });
    return map;
  }, [nodes]);

  const perColumn = useMemo(() => {
    const counts = new Map<number, number>();
    nodes.forEach((n) => counts.set(n.layer, (counts.get(n.layer) ?? 0) + 1));
    return counts;
  }, [nodes]);

  const width = PAD * 2 + (graph.columns ?? 1) * COL_W - (COL_W - BOX_W);
  const height = PAD * 2 + 26 + Math.max(...[...perColumn.values(), 1]) * ROW_H;

  // 고른 노드가 있으면 그 노드가 닿는 것만 진하게
  const related = useMemo(() => {
    if (!picked) return null;
    const ids = new Set<string>([picked]);
    links.forEach((l) => {
      if (l.from === picked) ids.add(l.to);
      if (l.to === picked) ids.add(l.from);
    });
    return ids;
  }, [picked, links]);

  const dim = (id: string) => (related && !related.has(id) ? 0.16 : 1);
  const linkDim = (l: GraphLink) =>
    related && !(l.from === picked || l.to === picked) ? 0.07 : l.dead ? 0.5 : 0.75;

  const pickedFiles = useMemo(() => {
    if (!picked) return [];
    const eats = links.filter((l) => l.to === picked);
    const makes = links.filter((l) => l.from === picked);
    return [
      ...eats.map((l) => ({ dir: "먹는다" as const, other: l.from, files: l.files })),
      ...makes.map((l) => ({ dir: "낸다" as const, other: l.to, files: l.files })),
    ];
  }, [picked, links]);

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  return (
    <div>
      <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ minWidth: width }}
          role="img"
          aria-label="자동화 연결 그림"
        >
          <defs>
            <marker id="tip" viewBox="0 0 10 10" refX="9" refY="5"
                    markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border-strong)" />
            </marker>
            <marker id="tipDead" viewBox="0 0 10 10" refX="9" refY="5"
                    markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--danger)" />
            </marker>
          </defs>

          {/* 열 제목 */}
          {COLUMN_TITLE.slice(0, graph.columns ?? 0).map((title, i) => (
            <text
              key={title}
              x={PAD + i * COL_W}
              y={14}
              fontSize={11}
              fontWeight={700}
              fill="var(--text-muted-new)"
            >
              {title}
            </text>
          ))}

          {/* 화살표 — 파일이 옮겨가는 길 */}
          {links.map((l, i) => {
            const a = place.get(l.from);
            const b = place.get(l.to);
            if (!a || !b) return null;
            const x1 = a.x + BOX_W;
            const y1 = a.y + BOX_H / 2;
            const x2 = b.x;
            const y2 = b.y + BOX_H / 2;
            const mid = (x1 + x2) / 2;
            const back = x2 <= x1; // 되돌아가는 선(순환)은 아래로 크게 우회
            const d = back
              ? `M ${x1} ${y1} C ${x1 + 46} ${y1 + 34}, ${x2 - 46} ${y2 + 34}, ${x2} ${y2}`
              : `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
            return (
              <path
                key={`${l.from}-${l.to}-${i}`}
                d={d}
                fill="none"
                stroke={l.dead ? "var(--danger)" : "var(--border-strong)"}
                strokeWidth={related && (l.from === picked || l.to === picked) ? 2 : 1.1}
                strokeDasharray={l.dead ? "4 3" : undefined}
                opacity={linkDim(l)}
                markerEnd={l.dead ? "url(#tipDead)" : "url(#tip)"}
              />
            );
          })}

          {/* 노드 */}
          {nodes.map((n) => {
            const pos = place.get(n.id)!;
            const c = FILL[n.status];
            const on = picked === n.id;
            return (
              <g
                key={n.id}
                transform={`translate(${pos.x},${pos.y})`}
                opacity={dim(n.id)}
                style={{ cursor: "pointer" }}
                onClick={() => setPicked(on ? null : n.id)}
              >
                <title>{`${n.label} · ${n.status}${n.manual ? " · 손이 필요" : ""}${n.note ? "\n" + n.note : ""}`}</title>
                <rect
                  width={BOX_W} height={BOX_H} rx={9}
                  fill={c.bg}
                  stroke={on ? "var(--text-main)" : c.border}
                  strokeWidth={on ? 2.2 : 1.2}
                />
                <circle cx={13} cy={BOX_H / 2} r={4} fill={c.border} />
                <text x={25} y={BOX_H / 2 - 2} fontSize={11.5} fontWeight={600} fill={c.text}>
                  {n.label.length > 19 ? n.label.slice(0, 18) + "…" : n.label}
                </text>
                <text x={25} y={BOX_H / 2 + 12} fontSize={9.5} fill="var(--text-muted-new)">
                  {n.status}
                  {n.manual ? " · 손" : ""}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 고른 노드가 주고받는 파일 */}
      {picked && (
        <div
          className="mt-3 rounded-xl p-3.5 border"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-strong)" }}
        >
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] font-bold">{byId.get(picked)?.label}</span>
            <button
              onClick={() => setPicked(null)}
              className="ml-auto text-[11px]"
              style={{ color: "var(--text-secondary)" }}
            >
              닫기
            </button>
          </div>
          {byId.get(picked)?.note && (
            <p className="mt-1 text-[11.5px]" style={{ color: "var(--text-secondary)" }}>
              {byId.get(picked)!.note}
            </p>
          )}
          <ul className="mt-2 flex flex-col gap-1">
            {pickedFiles.map((r, i) => (
              <li key={`${r.dir}-${r.other}-${i}`} className="text-[12px] leading-relaxed">
                <span
                  className="font-bold"
                  style={{ color: r.dir === "먹는다" ? "var(--secondary-text)" : "var(--accent-text)" }}
                >
                  {r.dir === "먹는다" ? "← 받는다" : "→ 준다"}
                </span>{" "}
                <span className="font-semibold">{byId.get(r.other)?.label ?? r.other}</span>
                <span style={{ color: "var(--text-muted-new)" }}>
                  {" · "}
                  {r.files.map(fileTag).join(", ")}
                </span>
              </li>
            ))}
            {pickedFiles.length === 0 && (
              <li className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                주고받는 게 없다 — 아무와도 안 이어져 있다.
              </li>
            )}
          </ul>
        </div>
      )}

      <p className="mt-2.5 text-[11px]" style={{ color: "var(--text-muted-new)" }}>
        노드를 누르면 그게 주고받는 파일만 남는다 · 점선 빨강 = 한쪽이 멈춘 연결
      </p>
    </div>
  );
}
