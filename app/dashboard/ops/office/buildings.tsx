// 새벽 길드 — 건축과 지형 높이.
//
// 한나 2026-08-29: "더 입체적이어야 돼. 너무 심심하잖아. 게임 속에 있는 듯한 느낌."
//
// 왜 건물이 필요한가: 지금까지는 잔디밭에 가구를 늘어놓은 것이라 '장소'가 아니었다.
// 입체감은 그림자 몇 개로 안 생긴다 — **높이**가 있어야 생긴다.
//   · 지붕과 벽이 있으면 뒤가 가려지고, 가려지면 앞뒤가 생긴다.
//   · 단(platform)에 계단을 붙이면 바닥이 한 겹이 아니게 된다.
//   · 굴뚝 연기·창문 불빛은 "지금 안에서 일이 벌어진다"를 말한다.
//   · 광원을 좌상단으로 통일해야 그림자가 한 방향으로 떨어져 세계가 하나로 붙는다.

import { TILE, hashOf } from "./sprites";
import { LAND } from "./world";

export const ROOF = {
  tile: "#9A5A4A",
  tileDark: "#7E4638",
  tileLight: "#B87060",
  thatch: "#B99C62",
  thatchDark: "#9A7E4A",
  wall: "#D9C7A4",
  wallDark: "#BCA684",
  beam: "#6E4A2A",
  glass: "#4A5A62",
  glassLit: "#F2C86A",
} as const;

/** 단 — 바닥을 한 겹 올려 높이를 만든다. 계단이 있어야 올라간 게 보인다. */
export function Platform({
  x, y, w, h, tone = LAND.stone,
}: { x: number; y: number; w: number; h: number; tone?: string }) {
  const lip = 6;
  return (
    <g shapeRendering="crispEdges">
      {/* 옆면 — 이게 높이다 */}
      <rect x={x} y={y + h} width={w} height={lip + 4} fill={ROOF.wallDark} />
      <rect x={x} y={y + h + lip} width={w} height={4} fill="#000" opacity={0.18} />
      {/* 윗면 */}
      <rect x={x} y={y} width={w} height={h} fill={tone} />
      <rect x={x} y={y} width={w} height={3} fill="#fff" opacity={0.12} />
      <rect x={x} y={y + h - 3} width={w} height={3} fill="#000" opacity={0.08} />
      {/* 계단 */}
      <rect x={x + w / 2 - TILE} y={y + h} width={TILE * 2} height={5} fill={tone} />
      <rect x={x + w / 2 - TILE * 1.2} y={y + h + 5} width={TILE * 2.4} height={5} fill={ROOF.wallDark} />
    </g>
  );
}

/**
 * 건물 — 지붕·벽·문·창. 일하는 중이면 창에 불이 들어오고 굴뚝에 연기가 난다.
 * kind: "workshop"(기와+굴뚝) | "barn"(초가) | "tower"(탑+깃발)
 */
export function Building({
  kind, w, h, alive, label,
}: {
  kind: "workshop" | "barn" | "tower";
  w: number;
  h: number;
  alive: boolean;
  label?: string;
}) {
  const roofH = kind === "tower" ? TILE * 2.2 : TILE * 2.6;
  const bodyY = roofH - 4;
  const bodyH = h - bodyY;
  const roofFill = kind === "barn" ? ROOF.thatch : ROOF.tile;
  const roofDark = kind === "barn" ? ROOF.thatchDark : ROOF.tileDark;

  return (
    <g shapeRendering="crispEdges">
      {/* 바닥 그림자 — 광원 좌상단이라 오른쪽 아래로 */}
      <rect x={6} y={h} width={w} height={6} fill={LAND.ink} opacity={0.22} />

      {/* 벽 */}
      <rect x={0} y={bodyY} width={w} height={bodyH} fill={ROOF.wall} />
      <rect x={0} y={bodyY} width={w} height={bodyH} fill="none" />
      <rect x={w - 10} y={bodyY} width={10} height={bodyH} fill="#000" opacity={0.09} />
      <rect x={0} y={h - 5} width={w} height={5} fill={ROOF.wallDark} />
      {/* 기둥 */}
      <rect x={3} y={bodyY} width={4} height={bodyH} fill={ROOF.beam} opacity={0.75} />
      <rect x={w - 7} y={bodyY} width={4} height={bodyH} fill={ROOF.beam} opacity={0.75} />

      {/* 창 — 안에서 일하면 불이 켜진다 */}
      {Array.from({ length: Math.max(1, Math.floor(w / (TILE * 3))) }).map((_, i) => {
        const wx = TILE * 1.2 + i * TILE * 3;
        if (wx + TILE * 1.4 > w - TILE) return null;
        return (
          <g key={i}>
            <rect x={wx} y={bodyY + 7} width={TILE * 1.4} height={TILE * 1.1}
                  fill={alive ? ROOF.glassLit : ROOF.glass} />
            <rect x={wx} y={bodyY + 7} width={TILE * 1.4} height={3} fill={ROOF.beam} opacity={0.6} />
            <rect x={wx + TILE * 0.62} y={bodyY + 7} width={3} height={TILE * 1.1}
                  fill={ROOF.beam} opacity={0.6} />
            {alive && (
              <rect x={wx - 3} y={bodyY + 7 + TILE * 1.1} width={TILE * 2}
                    height={TILE * 0.8} fill={ROOF.glassLit} opacity={0.14} />
            )}
          </g>
        );
      })}

      {/* 문 */}
      <rect x={w / 2 - TILE * 0.8} y={h - TILE * 2.1} width={TILE * 1.6} height={TILE * 2.1}
            fill={ROOF.beam} />
      <rect x={w / 2 - TILE * 0.65} y={h - TILE * 1.95} width={TILE * 1.3} height={TILE * 1.95}
            fill="#4E3520" />
      <rect x={w / 2 + TILE * 0.3} y={h - TILE * 1.1} width={3} height={3} fill={LAND.gold} />

      {/* 지붕 — 사다리꼴이라야 위에서 본 느낌이 산다 */}
      <path d={`M -8 ${roofH} L ${w * 0.16} 0 L ${w * 0.84} 0 L ${w + 8} ${roofH} Z`} fill={roofFill} />
      <path d={`M -8 ${roofH} L ${w * 0.16} 0 L ${w * 0.5} 0 L ${w * 0.5} ${roofH} Z`}
            fill="#fff" opacity={0.08} />
      <rect x={-8} y={roofH - 5} width={w + 16} height={5} fill={roofDark} />
      {kind !== "barn" &&
        Array.from({ length: 5 }).map((_, i) => (
          <rect key={i} x={-6 + ((w + 12) / 5) * i} y={2 + i * 0} width={2} height={roofH - 6}
                fill={roofDark} opacity={0.35} />
        ))}

      {/* 굴뚝 + 연기 */}
      {kind === "workshop" && (
        <g>
          <rect x={w * 0.72} y={-TILE * 1.1} width={TILE * 0.9} height={TILE * 1.9} fill="#8A7A6A" />
          <rect x={w * 0.72} y={-TILE * 1.1} width={TILE * 0.9} height={4} fill="#A3948A" />
          {alive && (
            <g className="gd-smoke">
              <circle cx={w * 0.78} cy={-TILE * 1.6} r={4} fill="#E8E2D4" opacity={0.6} />
              <circle cx={w * 0.83} cy={-TILE * 2.4} r={6} fill="#E8E2D4" opacity={0.4} />
              <circle cx={w * 0.76} cy={-TILE * 3.2} r={7} fill="#E8E2D4" opacity={0.22} />
            </g>
          )}
        </g>
      )}

      {/* 탑 깃발 */}
      {kind === "tower" && (
        <g>
          <rect x={w / 2 - 1} y={-TILE * 2.2} width={3} height={TILE * 2.4} fill="#6E6459" />
          <path d={`M ${w / 2 + 2} ${-TILE * 2.1} L ${w / 2 + TILE * 1.6} ${-TILE * 1.7} L ${w / 2 + 2} ${-TILE * 1.3} Z`}
                fill={alive ? "#C2553F" : "#7A5A52"} className={alive ? "gd-flag" : undefined} />
        </g>
      )}

      {/* 간판 */}
      {label && (() => {
        // 판 크기를 글자 수에 맞춘다. 고정 폭이면 긴 이름이 판을 넘친다
        // (한나 2026-08-30: "귀 기울이는 곳 7"이 삐져나왔다).
        // 한글은 한 자가 폰트 크기만큼, 숫자·공백은 절반쯤 먹는다.
        const units = [...label].reduce(
          (n, ch) => n + (/[0-9A-Za-z ·]/.test(ch) ? 0.55 : 1), 0);
        const size = units > 9 ? 9 : 10;
        const sw = Math.max(TILE * 3.8, units * size + TILE * 0.9);
        return (
          <g>
            <rect x={w / 2 - sw / 2} y={bodyY - TILE * 0.9} width={sw} height={TILE * 0.95}
                  rx={2} fill="#EFE2C4" stroke={ROOF.beam} strokeWidth={1.2} />
            <text x={w / 2} y={bodyY - TILE * 0.22} fontSize={size} fontWeight={800}
                  textAnchor="middle" fill={LAND.ink}>
              {label}
            </text>
          </g>
        );
      })()}
    </g>
  );
}

/** 울타리 — 구역 경계. 전경에 두면 카메라 앞에 있는 느낌이 난다. */
export function Fence({ w, seed = 0 }: { w: number; seed?: number }) {
  const posts = Math.floor(w / (TILE * 1.6));
  return (
    <g shapeRendering="crispEdges">
      <rect x={0} y={TILE * 0.5} width={w} height={4} fill="#8A6A46" />
      <rect x={0} y={TILE * 1.0} width={w} height={4} fill="#8A6A46" />
      {Array.from({ length: posts }).map((_, i) => (
        <g key={i}>
          <rect x={i * TILE * 1.6} y={0} width={5} height={TILE * 1.6} fill="#6E5136" />
          <rect x={i * TILE * 1.6} y={0} width={5} height={3} fill="#A8794C" />
        </g>
      ))}
      {hashOf(`fence${seed}`) % 2 === 0 && (
        <rect x={w * 0.4} y={TILE * 0.2} width={TILE * 0.8} height={TILE * 0.6} fill="#6FA35F" />
      )}
    </g>
  );
}

/** 우물 — 마을에 하나쯤 있어야 마을 같다 */
export function Well() {
  return (
    <g shapeRendering="crispEdges">
      <ellipse cx={TILE * 1.4} cy={TILE * 2.5} rx={TILE * 1.4} ry={5} fill={LAND.ink} opacity={0.2} />
      <rect x={TILE * 0.2} y={TILE * 1.5} width={TILE * 2.4} height={TILE} fill="#8A8880" />
      <rect x={TILE * 0.2} y={TILE * 1.5} width={TILE * 2.4} height={4} fill="#A3A199" />
      <rect x={TILE * 0.55} y={TILE * 1.6} width={TILE * 1.7} height={TILE * 0.4} fill="#2E3A42" />
      <rect x={TILE * 0.35} y={TILE * 0.2} width={4} height={TILE * 1.4} fill={ROOF.beam} />
      <rect x={TILE * 2.25} y={TILE * 0.2} width={4} height={TILE * 1.4} fill={ROOF.beam} />
      <path d={`M ${TILE * 0.05} ${TILE * 0.35} L ${TILE * 1.4} ${-TILE * 0.3} L ${TILE * 2.75} ${TILE * 0.35} Z`}
            fill={ROOF.thatch} />
      <rect x={TILE * 1.3} y={TILE * 0.4} width={2} height={TILE * 0.9} fill="#6E5136" />
    </g>
  );
}

/** 수레 — 짐이 오가는 곳이라는 표시 */
export function Cart({ loaded }: { loaded: boolean }) {
  return (
    <g shapeRendering="crispEdges">
      <ellipse cx={TILE * 1.6} cy={TILE * 2.2} rx={TILE * 1.6} ry={4} fill={LAND.ink} opacity={0.2} />
      <rect x={TILE * 0.2} y={TILE} width={TILE * 2.8} height={TILE * 0.9} fill="#9A6E42" />
      <rect x={TILE * 0.2} y={TILE} width={TILE * 2.8} height={4} fill="#B08652" />
      <rect x={TILE * 0.2} y={TILE * 0.5} width={4} height={TILE * 1.4} fill="#6E4E2E" />
      <rect x={TILE * 2.8} y={TILE * 0.5} width={4} height={TILE * 1.4} fill="#6E4E2E" />
      <circle cx={TILE * 0.8} cy={TILE * 2.05} r={TILE * 0.45} fill="#5E4A32" />
      <circle cx={TILE * 2.4} cy={TILE * 2.05} r={TILE * 0.45} fill="#5E4A32" />
      {loaded && (
        <>
          <rect x={TILE * 0.6} y={TILE * 0.45} width={TILE * 0.8} height={TILE * 0.6} fill="#8A6039" />
          <rect x={TILE * 1.6} y={TILE * 0.3} width={TILE * 0.9} height={TILE * 0.75} fill="#A8794C" />
          <rect x={TILE * 1.85} y={TILE * 0.05} width={5} height={5} fill="#A8CBE6" />
        </>
      )}
    </g>
  );
}

/** 전경 풀숲 — 화면 맨 아래. 카메라 앞에 뭔가 있으면 깊이가 확 산다. */
export function Foreground({ w }: { w: number }) {
  const tufts = Math.floor(w / 26);
  return (
    <g shapeRendering="crispEdges">
      {Array.from({ length: tufts }).map((_, i) => {
        const s = hashOf(`fg${i}`);
        const x = i * 26 + (s % 12);
        const tall = 10 + (s % 9);
        return (
          <g key={i}>
            <rect x={x} y={-tall} width={4} height={tall} fill="#3E6238" />
            <rect x={x + 5} y={-tall + 4} width={4} height={tall - 4} fill="#4E7A46" />
            <rect x={x - 4} y={-tall + 6} width={3} height={tall - 6} fill="#355630" />
          </g>
        );
      })}
    </g>
  );
}
