// 운반로 — 연결을 선이 아니라 '흐르는 물건'으로 보여준다.
//
// 한나 2026-08-29 조사에서 나온 답 (팩토리오):
//   선은 정적이라 겹치면 스파게티가 된다. 벨트 위에 물건이 실제로 실려 있으면
//   막힌 곳은 물건이 빽빽하게 서 있고, 굶은 곳은 텅 비어 있다.
//   병목을 찾으려고 숫자를 읽을 필요가 없다 — 눈에 그냥 보인다.
//
// 우리 판정 3종이 그대로 대응한다:
//   흐름  flowing  생산자가 돌고 소비자도 산다        → 물건이 고르게 흐른다
//   막힘  jammed   생산자는 내는데 소비자가 멈췄다     → 끝에 물건이 쌓여 안 움직인다
//   굶음  starved  생산자가 안 낸다                  → 벨트가 비어 있다
//   고아  orphan   아무도 안 가져간다                → 끝에서 물건이 굴러떨어져 쌓인다

import { hashOf } from "./sprites";

export type BeltState = "flowing" | "jammed" | "starved" | "orphan";

const CRATE = {
  wood: "#A8794C",
  woodDark: "#7A5836",
  glow: "#A8CBE6",
  glowHot: "#D8E8F4",
};

/** 벨트 바닥 — 물건이 없어도 길은 남는다. 연결의 증거. */
export function BeltLane({
  d, state, dim = false,
}: { d: string; state: BeltState; dim?: boolean }) {
  const tone =
    state === "jammed" ? "#8A5A3A"
    : state === "orphan" ? "#6E6458"
    : state === "starved" ? "#7A7264"
    : "#8A7A5C";
  return (
    <g opacity={dim ? 0.12 : 1}>
      <path d={d} fill="none" stroke="#4A4034" strokeWidth={11}
            strokeLinecap="round" strokeLinejoin="round" opacity={0.35} />
      <path d={d} fill="none" stroke={tone} strokeWidth={8}
            strokeLinecap="round" strokeLinejoin="round" />
      {/* 벨트 결 — 방향이 보이게 */}
      <path d={d} fill="none" stroke="#000" strokeWidth={8} opacity={0.14}
            strokeDasharray="3 9" strokeLinecap="butt"
            className={state === "flowing" ? "bt-tread" : undefined} />
    </g>
  );
}

/**
 * 벨트 위의 물건.
 *  · flowing — 고르게 흐른다
 *  · jammed  — 끝쪽에 붙어 멈춘다 (offset-distance를 끝 근처에 고정)
 *  · starved — 아무것도 없다
 *  · orphan  — 끝에 쌓인다
 */
export function BeltCargo({
  d, state, count = 4, seed = 0, dim = false,
}: { d: string; state: BeltState; count?: number; seed?: number; dim?: boolean }) {
  if (state === "starved") return null;

  const jam = state === "jammed" || state === "orphan";
  const n = jam ? Math.min(5, count + 1) : count;

  return (
    <g opacity={dim ? 0.15 : 1}>
      {Array.from({ length: n }).map((_, i) => {
        const wobble = (hashOf(`${seed}c${i}`) % 5) - 2;
        // 막히면 끝에 다닥다닥 붙어 선다. 흐르면 균등 간격으로 돈다.
        const style: React.CSSProperties = jam
          ? { offsetPath: `path("${d}")`, offsetDistance: `${88 - i * 5.5}%`,
              offsetRotate: "0deg" }
          : { offsetPath: `path("${d}")`, offsetRotate: "0deg",
              animation: `bt-move ${9 + (seed % 4)}s linear infinite`,
              animationDelay: `-${(i * (9 + (seed % 4))) / n}s` };
        return (
          <g key={i} style={style}>
            <g transform={`translate(-5,${-6 + wobble * 0.4})`} shapeRendering="crispEdges">
              <rect x={0} y={2} width={11} height={3} fill="#000" opacity={0.2} />
              <rect x={0} y={-5} width={11} height={9} fill={CRATE.wood} />
              <rect x={0} y={-5} width={11} height={2} fill="#C09468" />
              <rect x={0} y={-1} width={11} height={2} fill={CRATE.woodDark} />
              <rect x={3} y={-9} width={5} height={5}
                    fill={state === "orphan" ? "#8A8880" : CRATE.glow} />
              <rect x={4} y={-11} width={3} height={3}
                    fill={state === "orphan" ? "#9A9890" : CRATE.glowHot} opacity={0.9} />
            </g>
          </g>
        );
      })}
    </g>
  );
}

/** 막힌 끝에 쌓인 더미 — "여기서 멈췄다"를 못 놓치게 */
export function Pileup({ x, y, kind }: { x: number; y: number; kind: BeltState }) {
  if (kind !== "jammed" && kind !== "orphan") return null;
  const warn = kind === "jammed";
  return (
    <g transform={`translate(${x},${y})`} shapeRendering="crispEdges">
      <ellipse cx={9} cy={13} rx={16} ry={4} fill="#1B1410" opacity={0.22} />
      {[[0, 4], [11, 4], [5, -4], [16, -1]].map(([bx, by], i) => (
        <g key={i} transform={`translate(${bx},${by})`}>
          <rect width={10} height={8} fill={CRATE.wood} />
          <rect width={10} height={2} fill="#C09468" />
          <rect y={4} width={10} height={2} fill={CRATE.woodDark} />
        </g>
      ))}
      <g transform="translate(6,-20)" className="bt-warn">
        <rect x={-1} y={1} width={22} height={16} rx={3} fill="#000" opacity={0.2} />
        <rect width={22} height={16} rx={3} fill={warn ? "#F6DCCE" : "#E6E2D6"}
              stroke={warn ? "#C2412B" : "#7A7264"} strokeWidth={1.6} />
        <text x={11} y={12} fontSize={11} textAnchor="middle">{warn ? "❗" : "…"}</text>
      </g>
    </g>
  );
}

/** 벨트가 쓰는 애니메이션. 화면당 한 번만 심는다. */
export const BELT_KEYFRAMES = `
  @keyframes bt-move { from { offset-distance: 0%; } to { offset-distance: 100%; } }
  @keyframes bt-tread { to { stroke-dashoffset: -24; } }
  @keyframes bt-warn { 0%,100% { transform: translate(6px,-20px) scale(1); }
                       45% { transform: translate(6px,-25px) scale(1.08); } }
  .bt-tread { animation: bt-tread 1.1s linear infinite; }
  .bt-warn  { animation: bt-warn 1.3s ease-in-out infinite; }
  @media (prefers-reduced-motion: reduce) {
    .bt-tread, .bt-warn { animation: none !important; }
    [style*="bt-move"] { animation: none !important; }
  }
`;
