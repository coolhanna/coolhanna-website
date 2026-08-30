// 새벽 길드 — 세계 부품 (지형·작업대·소품).
//
// 세계관: 어제의 조각을 캐서, 벼려서, 아침으로 만들어 한나에게 나르는 길드.
//   채집터 → 공방 → 전령소. 구역이 곧 파이프라인이다.
//
// 픽셀 규칙:
//  · 3/4 탑다운, 16px 타일 (SLYNYRD Pixelblog 20/35)
//  · **격자를 깬다** — 같은 타일을 반복하면 세계가 아니라 표가 된다.
//    바닥에 결·잡초·돌을 해시로 흩고, 작업대 위치도 사람마다 흔든다.
//  · 작업대는 역할마다 생김새가 다르다. 다 같은 책상이면 다 같은 일로 보인다.

import { TILE, hashOf } from "./sprites";

export const LAND = {
  // 채집터 — 밤이 걷히는 들판
  grass: "#6E8A55",
  grassDark: "#5C7847",
  grassLight: "#82A063",
  soil: "#8A6A45",
  soilDark: "#75593A",
  // 공방 — 돌바닥과 화로
  stone: "#8E8A80",
  stoneDark: "#77736A",
  stoneLight: "#A29D91",
  ember: "#E08A3C",
  // 전령소 — 닦인 돌과 융단
  marble: "#B7B0A2",
  marbleDark: "#9D9789",
  carpet: "#7A5A78",
  carpetDark: "#654A63",
  // 공통
  wood: "#8A6039",
  woodLight: "#A8794C",
  iron: "#4A4F55",
  ironLight: "#666C74",
  ink: "#2E2822",
  gold: "#E6C46A",
} as const;

export type ZoneKind = "field" | "forge" | "post";

/** 지형 — 구역마다 다른 바닥. 해시로 결과 잡티를 흩어 격자를 깬다. */
export function Ground({
  kind, x, y, w, h,
}: { kind: ZoneKind; x: number; y: number; w: number; h: number }) {
  const base =
    kind === "field" ? LAND.grass : kind === "forge" ? LAND.stone : LAND.marble;
  const dark =
    kind === "field" ? LAND.grassDark : kind === "forge" ? LAND.stoneDark : LAND.marbleDark;
  const light =
    kind === "field" ? LAND.grassLight : kind === "forge" ? LAND.stoneLight : LAND.marble;

  // 해시로 뿌리는 잡티 — 규칙적이지만 눈에는 무작위로 보인다.
  const specks = Array.from({ length: Math.floor((w * h) / 900) }).map((_, i) => {
    const seed = hashOf(`${kind}${x}${i}`);
    return {
      x: x + (seed % Math.max(1, Math.floor(w - 6))),
      y: y + ((seed >> 7) % Math.max(1, Math.floor(h - 6))),
      w: 2 + (seed % 3),
      dark: seed % 3 === 0,
    };
  });

  return (
    <g shapeRendering="crispEdges">
      <rect x={x} y={y} width={w} height={h} fill={base} />
      {kind === "forge" &&
        Array.from({ length: Math.ceil(h / TILE) }).map((_, r) =>
          Array.from({ length: Math.ceil(w / TILE) }).map((_, c) => (
            <rect key={`${r}-${c}`} x={x + c * TILE} y={y + r * TILE}
                  width={TILE - 1} height={TILE - 1} fill="none"
                  stroke={dark} strokeWidth={0.6} opacity={0.5} />
          )),
        )}
      {kind === "post" &&
        Array.from({ length: Math.ceil(h / (TILE * 2)) }).map((_, r) => (
          <rect key={r} x={x} y={y + r * TILE * 2} width={w} height={1} fill={dark} opacity={0.4} />
        ))}
      {specks.map((s, i) => (
        <rect key={i} x={s.x} y={s.y} width={s.w} height={2}
              fill={s.dark ? dark : light} opacity={kind === "field" ? 0.85 : 0.5} />
      ))}
    </g>
  );
}

/** 흙길 — 작업대 사이를 오간 흔적. 아무도 안 걸어도 길이 남아 연결이 보인다. */
export function Trail({ d, worn = 0.5 }: { d: string; worn?: number }) {
  return (
    <g>
      <path d={d} fill="none" stroke={LAND.soilDark} strokeWidth={9}
            strokeLinecap="round" strokeLinejoin="round" opacity={worn * 0.5} />
      <path d={d} fill="none" stroke={LAND.soil} strokeWidth={6}
            strokeLinecap="round" strokeLinejoin="round" opacity={worn} />
    </g>
  );
}

// ── 작업대 — 역할마다 생김새가 다르다 ──────────────────────────

/** 채집대 — 바구니와 나무 궤짝 */
export function GatherStation({ full }: { full: boolean }) {
  return (
    <g shapeRendering="crispEdges">
      <ellipse cx={TILE * 2} cy={TILE * 2.55} rx={TILE * 2} ry={5} fill={LAND.ink} opacity={0.18} />
      <rect x={0} y={TILE * 1.1} width={TILE * 2.6} height={TILE * 1.3} fill={LAND.wood} />
      <rect x={0} y={TILE * 1.1} width={TILE * 2.6} height={4} fill={LAND.woodLight} />
      <rect x={TILE * 0.5} y={TILE * 1.1} width={3} height={TILE * 1.3} fill={LAND.woodLight} opacity={0.6} />
      <rect x={TILE * 1.6} y={TILE * 1.1} width={3} height={TILE * 1.3} fill={LAND.woodLight} opacity={0.6} />
      {/* 바구니 */}
      <rect x={TILE * 2.9} y={TILE * 1.5} width={TILE * 1.3} height={TILE * 0.9} fill="#B08A52" />
      <rect x={TILE * 2.9} y={TILE * 1.5} width={TILE * 1.3} height={3} fill="#C9A268" />
      {full && (
        <>
          <rect x={TILE * 3.05} y={TILE * 1.2} width={5} height={5} fill="#7FB0D8" />
          <rect x={TILE * 3.5} y={TILE * 1.1} width={5} height={5} fill="#A8CBE6" />
          <rect x={TILE * 3.3} y={TILE * 0.9} width={4} height={4} fill="#D8E8F4" />
        </>
      )}
    </g>
  );
}

/** 공방대 — 화로와 모루. 불이 살아 있으면 일하는 중이다. */
export function ForgeStation({ hot }: { hot: boolean }) {
  return (
    <g shapeRendering="crispEdges">
      <ellipse cx={TILE * 2} cy={TILE * 2.55} rx={TILE * 2} ry={5} fill={LAND.ink} opacity={0.2} />
      {/* 화로 */}
      <rect x={0} y={TILE * 1.2} width={TILE * 1.8} height={TILE * 1.2} fill={LAND.iron} />
      <rect x={0} y={TILE * 1.2} width={TILE * 1.8} height={4} fill={LAND.ironLight} />
      <rect x={TILE * 0.35} y={TILE * 1.45} width={TILE * 1.1} height={TILE * 0.6}
            fill={hot ? LAND.ember : "#3A3A38"} />
      {hot && (
        <>
          <rect x={TILE * 0.55} y={TILE * 1.5} width={TILE * 0.7} height={TILE * 0.35} fill="#F6C05A" />
          <rect x={TILE * 0.75} y={TILE * 0.95} width={4} height={6} fill="#F0A040" opacity={0.85} />
        </>
      )}
      {/* 모루 */}
      <rect x={TILE * 2.3} y={TILE * 1.55} width={TILE * 1.5} height={TILE * 0.5} fill={LAND.iron} />
      <rect x={TILE * 2.6} y={TILE * 2.0} width={TILE * 0.9} height={TILE * 0.4} fill={LAND.ironLight} />
      <rect x={TILE * 2.3} y={TILE * 1.55} width={TILE * 1.5} height={3} fill={LAND.ironLight} />
    </g>
  );
}

/** 연금대 — 가마솥. 끓으면 일하는 중. */
export function BrewStation({ hot }: { hot: boolean }) {
  return (
    <g shapeRendering="crispEdges">
      <ellipse cx={TILE * 2} cy={TILE * 2.55} rx={TILE * 2} ry={5} fill={LAND.ink} opacity={0.2} />
      <rect x={TILE * 0.4} y={TILE * 1.35} width={TILE * 2.2} height={TILE * 1.05} fill={LAND.iron} />
      <rect x={TILE * 0.25} y={TILE * 1.25} width={TILE * 2.5} height={TILE * 0.3} fill={LAND.ironLight} />
      <rect x={TILE * 0.55} y={TILE * 1.3} width={TILE * 1.9} height={TILE * 0.25}
            fill={hot ? "#7FC98A" : "#3E4A42"} />
      {hot && (
        <>
          <rect x={TILE * 1.0} y={TILE * 0.85} width={4} height={7} fill="#9FE0AC" opacity={0.8} />
          <rect x={TILE * 1.7} y={TILE * 0.65} width={3} height={6} fill="#9FE0AC" opacity={0.6} />
        </>
      )}
      {/* 선반 */}
      <rect x={TILE * 3.0} y={TILE * 1.1} width={TILE * 1.2} height={4} fill={LAND.wood} />
      <rect x={TILE * 3.1} y={TILE * 0.75} width={5} height={7} fill="#C46A8A" />
      <rect x={TILE * 3.7} y={TILE * 0.8} width={5} height={6} fill="#6A9AC4" />
    </g>
  );
}

/** 베틀 — 실을 엮어 이야기를 만든다 (기록·리포트 담당) */
export function LoomStation({ busy }: { busy: boolean }) {
  return (
    <g shapeRendering="crispEdges">
      <ellipse cx={TILE * 2} cy={TILE * 2.55} rx={TILE * 1.9} ry={5} fill={LAND.ink} opacity={0.18} />
      <rect x={TILE * 0.3} y={TILE * 0.7} width={4} height={TILE * 1.7} fill={LAND.wood} />
      <rect x={TILE * 3.0} y={TILE * 0.7} width={4} height={TILE * 1.7} fill={LAND.wood} />
      <rect x={TILE * 0.3} y={TILE * 0.7} width={TILE * 2.9} height={4} fill={LAND.woodLight} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={TILE * (0.6 + i * 0.6)} y={TILE * 0.95} width={2} height={TILE * 1.2}
              fill={busy ? "#E8D9A8" : "#9A9080"} opacity={0.9} />
      ))}
      <rect x={TILE * 0.3} y={TILE * 2.1} width={TILE * 2.9} height={TILE * 0.35} fill={LAND.woodLight} />
    </g>
  );
}

/** 전령대 — 두루마리 책상과 전서구 횃대 */
export function PostStation({ ready }: { ready: boolean }) {
  return (
    <g shapeRendering="crispEdges">
      <ellipse cx={TILE * 2} cy={TILE * 2.55} rx={TILE * 2} ry={5} fill={LAND.ink} opacity={0.18} />
      <rect x={0} y={TILE * 1.35} width={TILE * 2.6} height={TILE * 0.9} fill={LAND.wood} />
      <rect x={0} y={TILE * 1.25} width={TILE * 2.6} height={TILE * 0.2} fill={LAND.woodLight} />
      {/* 두루마리 */}
      <rect x={TILE * 0.4} y={TILE * 1.05} width={TILE * 1.1} height={TILE * 0.3} fill="#EFE6CE" />
      <rect x={TILE * 0.4} y={TILE * 1.05} width={3} height={TILE * 0.3} fill="#C9B98E" />
      <rect x={TILE * 1.2} y={TILE * 1.05} width={3} height={TILE * 0.3} fill="#C9B98E" />
      {/* 횃대 */}
      <rect x={TILE * 3.2} y={TILE * 0.6} width={4} height={TILE * 1.8} fill={LAND.wood} />
      <rect x={TILE * 2.9} y={TILE * 0.6} width={TILE} height={4} fill={LAND.woodLight} />
      {ready && (
        <g>
          <rect x={TILE * 3.0} y={TILE * 0.25} width={8} height={6} fill="#D8DCE4" />
          <rect x={TILE * 3.5} y={TILE * 0.3} width={3} height={3} fill={LAND.gold} />
          <rect x={TILE * 2.95} y={TILE * 0.35} width={3} height={2} fill={LAND.ink} />
        </g>
      )}
    </g>
  );
}

// ── 소품 — 격자를 깨는 것들 ────────────────────────────────────

export function Tree({ seed }: { seed: number }) {
  const tall = seed % 2 === 0;
  return (
    <g shapeRendering="crispEdges">
      <ellipse cx={TILE} cy={TILE * 2.5} rx={TILE * 0.9} ry={4} fill={LAND.ink} opacity={0.2} />
      <rect x={TILE * 0.8} y={TILE * 1.2} width={6} height={TILE * 1.3} fill="#6B4A2A" />
      <rect x={TILE * 0.1} y={tall ? 0 : TILE * 0.3} width={TILE * 1.8} height={TILE * 1.4} fill="#4E7A46" />
      <rect x={TILE * 0.35} y={tall ? -TILE * 0.3 : 0} width={TILE * 1.3} height={TILE * 0.9} fill="#5E8F52" />
      <rect x={TILE * 0.6} y={tall ? -TILE * 0.5 : -TILE * 0.2} width={TILE * 0.8} height={TILE * 0.6} fill="#6FA35F" />
    </g>
  );
}

export function Barrel({ seed }: { seed: number }) {
  return (
    <g shapeRendering="crispEdges">
      <ellipse cx={TILE * 0.6} cy={TILE * 1.35} rx={TILE * 0.6} ry={3} fill={LAND.ink} opacity={0.18} />
      <rect x={TILE * 0.1} y={TILE * 0.35} width={TILE} height={TILE} fill="#9A6E42" />
      <rect x={TILE * 0.1} y={TILE * 0.55} width={TILE} height={3} fill="#6E4E2E" />
      <rect x={TILE * 0.1} y={TILE * 1.0} width={TILE} height={3} fill="#6E4E2E" />
      <rect x={TILE * 0.1} y={TILE * 0.35} width={TILE} height={4} fill="#B08652" />
      {seed % 3 === 0 && <rect x={TILE * 0.3} y={TILE * 0.1} width={TILE * 0.6} height={5} fill="#7FB0D8" />}
    </g>
  );
}

export function Lantern({ lit }: { lit: boolean }) {
  return (
    <g shapeRendering="crispEdges">
      <rect x={TILE * 0.4} y={TILE * 0.5} width={4} height={TILE * 1.6} fill={LAND.iron} />
      <rect x={TILE * 0.1} y={TILE * 0.15} width={TILE * 0.9} height={TILE * 0.7}
            fill={lit ? "#F6D77A" : "#5A5A54"} />
      <rect x={TILE * 0.05} y={TILE * 0.1} width={TILE} height={4} fill={LAND.iron} />
      {lit && <circle cx={TILE * 0.55} cy={TILE * 0.5} r={TILE * 1.4} fill="#FFE9A8" opacity={0.10} />}
    </g>
  );
}

export function Rock({ seed }: { seed: number }) {
  const big = seed % 2 === 0;
  return (
    <g shapeRendering="crispEdges">
      <ellipse cx={TILE * 0.5} cy={TILE * 0.75} rx={big ? 11 : 7} ry={3} fill={LAND.ink} opacity={0.16} />
      <rect x={0} y={TILE * 0.25} width={big ? TILE : TILE * 0.7} height={TILE * 0.5} fill="#8A8880" />
      <rect x={2} y={TILE * 0.15} width={big ? TILE * 0.7 : TILE * 0.45} height={TILE * 0.3} fill="#A3A199" />
    </g>
  );
}

/** 수풀 — 나무보다 낮아 시야를 안 막으면서 경계를 만든다. */
export function Bush({ seed }: { seed: number }) {
  const berries = seed % 3 === 0;
  return (
    <g shapeRendering="crispEdges">
      <ellipse cx={TILE * 0.8} cy={TILE * 1.15} rx={TILE * 0.8} ry={3} fill={LAND.ink} opacity={0.16} />
      <rect x={TILE * 0.1} y={TILE * 0.45} width={TILE * 1.4} height={TILE * 0.65} fill="#43704A" />
      <rect x={TILE * 0.3} y={TILE * 0.2} width={TILE} height={TILE * 0.5} fill="#54885A" />
      <rect x={TILE * 0.55} y={TILE * 0.05} width={TILE * 0.5} height={TILE * 0.3} fill="#65A06A" />
      {berries && (
        <>
          <rect x={TILE * 0.45} y={TILE * 0.5} width={3} height={3} fill="#C2412B" />
          <rect x={TILE * 0.95} y={TILE * 0.7} width={3} height={3} fill="#C2412B" />
        </>
      )}
    </g>
  );
}

/** 통나무 — 베어 눕힌 나무. 앉기도 하고 길을 막기도 한다. */
export function Log({ seed }: { seed: number }) {
  const long = seed % 2 === 0;
  const w = long ? TILE * 2 : TILE * 1.4;
  return (
    <g shapeRendering="crispEdges">
      <ellipse cx={w / 2} cy={TILE * 0.85} rx={w / 2} ry={3} fill={LAND.ink} opacity={0.18} />
      <rect x={0} y={TILE * 0.3} width={w} height={TILE * 0.5} fill="#7A5836" />
      <rect x={0} y={TILE * 0.3} width={w} height={4} fill="#966E45" />
      <rect x={w - 5} y={TILE * 0.3} width={5} height={TILE * 0.5} fill="#B08652" />
      <rect x={w - 4} y={TILE * 0.45} width={3} height={3} fill="#8A6440" />
    </g>
  );
}

/** 들꽃 — 아무 기능 없다. 마을이 살아 있어 보이려고 있다. */
export function Flowers({ seed }: { seed: number }) {
  const hue = ["#E0C34A", "#D9718A", "#C7A2D8"][seed % 3];
  return (
    <g shapeRendering="crispEdges">
      {[0, 1, 2].map((i) => {
        const dx = i * 7 + (seed >> (i * 2)) % 4;
        const dy = ((seed >> (i * 3)) % 5) + TILE * 0.4;
        return (
          <g key={i}>
            <rect x={dx + 1} y={dy} width={2} height={7} fill="#4E7A46" />
            <rect x={dx} y={dy - 3} width={4} height={4} fill={hue} />
          </g>
        );
      })}
    </g>
  );
}

/** 표지판 — 갈림길에 선다. 글자는 없다, 여기서 갈린다는 것만 말한다. */
export function Signpost({ seed }: { seed: number }) {
  return (
    <g shapeRendering="crispEdges">
      <ellipse cx={TILE * 0.5} cy={TILE * 1.9} rx={7} ry={3} fill={LAND.ink} opacity={0.18} />
      <rect x={TILE * 0.4} y={TILE * 0.3} width={4} height={TILE * 1.6} fill="#6B4A2A" />
      <rect x={seed % 2 ? TILE * 0.5 : -TILE * 0.3} y={TILE * 0.35}
            width={TILE * 1.1} height={TILE * 0.45} fill="#A8794C" />
      <rect x={seed % 2 ? TILE * 0.5 : -TILE * 0.3} y={TILE * 0.35}
            width={TILE * 1.1} height={3} fill="#C09468" />
    </g>
  );
}

/** 아치문 — 구역 사이 통로. 벽 대신 문이라야 오갈 수 있어 보인다. */
export function Archway({ h }: { h: number }) {
  return (
    <g shapeRendering="crispEdges">
      <rect x={0} y={0} width={TILE * 0.75} height={h} fill="#7E7468" />
      <rect x={2} y={0} width={3} height={h} fill="#948A7C" opacity={0.7} />
      <rect x={-4} y={0} width={TILE * 1.2} height={TILE * 0.5} fill="#948A7C" />
      <rect x={-4} y={h - TILE * 0.4} width={TILE * 1.2} height={TILE * 0.4} fill="#6E6459" />
    </g>
  );
}
