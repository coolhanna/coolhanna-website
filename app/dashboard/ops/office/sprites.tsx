// 쿨한나 오피스 — 스프라이트 부품.
//
// 픽셀아트 규칙은 SLYNYRD Pixelblog 35(탑다운 인테리어) / 22(탑다운 캐릭터)를 따랐다:
//  · 3/4 탑다운 투영 — 바닥과 가구 앞면이 같이 보인다. 납작한 위에서 보기가 아니다.
//  · 16px 타일 격자 — 벽·바닥·가구가 전부 같은 격자에 앉아야 한 세계로 읽힌다.
//  · 캐릭터는 1타일 폭 × 2타일 높이(16×32). 머리가 전체의 1/3~1/2이어야 표정이 산다.
//  · 가구·캐릭터·벽 높이의 비례를 지킨다. 그림자로 깊이를 준다.
//  · 색은 적게. 따뜻한 나무 + 세이지 — 한나 대시보드 토큰과 같은 계열.

export const TILE = 16;

export const PALETTE = {
  floor: "#C8A06A",
  floorSeam: "#B08850",
  floorGrain: "#BE9660",
  wall: "#E9DFC8",
  wallShade: "#DCCFB2",
  baseboard: "#B99C72",
  deskTop: "#A8794C",
  deskFront: "#8A6039",
  deskEdge: "#C09468",
  deskLeg: "#6E4A2A",
  chair: "#6E7A62",
  chairDark: "#57634C",
  monitor: "#33372F",
  screenOn: "#A9DCF2",
  screenOff: "#55604F",
  ink: "#3A2C1C",
  shadow: "#8A6B44",
} as const;

export const SKIN = ["#F2CBA3", "#E0B189", "#D19C74", "#F6D8B8"];
export const HAIR = ["#35271E", "#6B4526", "#2A2833", "#8A5A2B", "#4A3A2E", "#7A6A55"];

/** 상태별 셔츠 색 — 대시보드 토큰과 같은 계열로 맞춘다. */
export const SHIRT: Record<string, string> = {
  돌음: "#7A8B6A",
  조용: "#B5A874",
  멈춤: "#A85A35",
  도달: "#6B7A8B",
};

/** 값에서 안정적인 의사난수 — 새로고침해도 같은 사람이 같은 머리색이어야 한다. */
export function hashOf(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** 바닥 — 나무 널. 이음선과 결을 넣어야 타일이 살아난다. */
export function Floor({ w, h, y0 }: { w: number; h: number; y0: number }) {
  const planks = Math.ceil(h / (TILE * 2));
  return (
    <g shapeRendering="crispEdges">
      <rect x={0} y={y0} width={w} height={h} fill={PALETTE.floor} />
      {Array.from({ length: planks }).map((_, i) => (
        <g key={i}>
          <rect x={0} y={y0 + i * TILE * 2} width={w} height={1} fill={PALETTE.floorSeam} />
          <rect
            x={(i % 2) * TILE * 3}
            y={y0 + i * TILE * 2 + TILE}
            width={w}
            height={1}
            fill={PALETTE.floorGrain}
            opacity={0.55}
          />
        </g>
      ))}
    </g>
  );
}

/** 벽 — 걸레받이가 있어야 바닥과 벽이 분리돼 보인다. */
export function Wall({ w, h }: { w: number; h: number }) {
  return (
    <g shapeRendering="crispEdges">
      <rect x={0} y={0} width={w} height={h} fill={PALETTE.wall} />
      <rect x={0} y={h - TILE * 0.75} width={w} height={TILE * 0.75} fill={PALETTE.wallShade} />
      <rect x={0} y={h - 4} width={w} height={4} fill={PALETTE.baseboard} />
    </g>
  );
}

/** 창문 + 바닥에 떨어지는 빛. 빛이 있어야 방이 된다. */
export function Window({ x, y, floorY, floorH }: { x: number; y: number; floorY: number; floorH: number }) {
  return (
    <g shapeRendering="crispEdges">
      <rect x={x - 4} y={y - 5} width={TILE * 5 + 8} height={5} fill={PALETTE.baseboard} />
      <rect x={x} y={y} width={TILE * 5} height={TILE * 3.5} fill="#93C6E6" />
      <rect x={x} y={y} width={TILE * 5} height={TILE * 1.2} fill="#A9D6EF" />
      <rect x={x + TILE * 2.4} y={y} width={4} height={TILE * 3.5} fill={PALETTE.wall} />
      <rect x={x} y={y + TILE * 1.7} width={TILE * 5} height={3} fill={PALETTE.wall} />
      {/* 바닥 빛 */}
      <path
        d={`M ${x + 6} ${floorY} L ${x + TILE * 5 - 6} ${floorY} L ${x + TILE * 5 + 14} ${floorY + floorH} L ${x - 14} ${floorY + floorH} Z`}
        fill="#FFF3D0"
        opacity={0.13}
      />
    </g>
  );
}

/** 책상 — 3/4 투영이라 상판과 앞면이 같이 보인다. 캐릭터 하반신을 가려 깊이를 만든다. */
export function Desk({ lit, busy }: { lit: boolean; busy: boolean }) {
  return (
    <g shapeRendering="crispEdges">
      {/* 그림자 */}
      <rect x={2} y={TILE * 2.4} width={TILE * 4.5} height={5} fill={PALETTE.shadow} opacity={0.22} />
      {/* 상판 */}
      <rect x={0} y={TILE} width={TILE * 4.5} height={TILE * 0.5} fill={PALETTE.deskEdge} />
      <rect x={0} y={TILE * 1.4} width={TILE * 4.5} height={TILE * 0.9} fill={PALETTE.deskTop} />
      {/* 앞면 */}
      <rect x={0} y={TILE * 2.2} width={TILE * 4.5} height={TILE * 0.45} fill={PALETTE.deskFront} />
      <rect x={TILE * 0.3} y={TILE * 2.6} width={4} height={TILE * 0.8} fill={PALETTE.deskLeg} />
      <rect x={TILE * 3.9} y={TILE * 2.6} width={4} height={TILE * 0.8} fill={PALETTE.deskLeg} />
      {/* 모니터 — 뒷모습이라 등판이 보인다 */}
      <rect x={TILE * 0.4} y={TILE * 0.1} width={TILE * 1.7} height={TILE * 1.05} fill={PALETTE.monitor} />
      <rect x={TILE * 0.55} y={TILE * 0.25} width={TILE * 1.4} height={TILE * 0.75}
            fill={lit ? PALETTE.screenOn : PALETTE.screenOff} />
      {lit && (
        <g opacity={0.5}>
          <rect x={TILE * 0.7} y={TILE * 0.42} width={TILE * 0.7} height={2} fill={PALETTE.monitor} />
          <rect x={TILE * 0.7} y={TILE * 0.62} width={TILE * 1.0} height={2} fill={PALETTE.monitor}>
            {busy && (
              <animate attributeName="width" values={`${TILE * 0.4};${TILE * 1.1};${TILE * 0.6}`}
                       dur="2.4s" repeatCount="indefinite" />
            )}
          </rect>
        </g>
      )}
      <rect x={TILE * 1.0} y={TILE * 1.15} width={TILE * 0.5} height={3} fill={PALETTE.monitor} />
      {/* 키보드 · 머그 */}
      <rect x={TILE * 2.4} y={TILE * 1.55} width={TILE * 1.1} height={TILE * 0.35} fill="#EDE4CE" />
      <rect x={TILE * 3.7} y={TILE * 1.45} width={TILE * 0.45} height={TILE * 0.5} fill="#C96A4A" />
    </g>
  );
}

/** 의자 등받이 — 캐릭터 뒤에 깔려야 앉은 것처럼 보인다. */
export function ChairBack() {
  return (
    <g shapeRendering="crispEdges">
      <rect x={TILE * 0.1} y={0} width={TILE * 1.05} height={TILE * 1.1} rx={2} fill={PALETTE.chair} />
      <rect x={TILE * 0.1} y={TILE * 0.85} width={TILE * 1.05} height={4} fill={PALETTE.chairDark} />
    </g>
  );
}

/**
 * 캐릭터 — 3/4 탑다운. 1타일 폭 × 2타일 높이 기준(16×32).
 * 머리가 크다(전체의 약 40%). 작은 스프라이트에서 표정이 읽히려면 그래야 한다.
 * 앉은 자세는 상반신만 그린다 — 하반신은 책상이 가린다.
 */
export function Person({
  seed,
  status,
  sitting = true,
  glasses = false,
}: {
  seed: number;
  status: string;
  sitting?: boolean;
  glasses?: boolean;
}) {
  const skin = SKIN[seed % SKIN.length];
  const hair = HAIR[(seed >> 3) % HAIR.length];
  const shirt = SHIRT[status] ?? SHIRT.돌음;
  const long = seed % 3 === 0;      // 긴 머리 / 짧은 머리
  const asleep = status === "멈춤";

  return (
    <g shapeRendering="crispEdges">
      {/* 몸통 — 어깨를 살짝 넓게 */}
      <rect x={1} y={17} width={14} height={13} fill={shirt} />
      <rect x={0} y={19} width={2} height={8} fill={shirt} />
      <rect x={14} y={19} width={2} height={8} fill={shirt} />
      <rect x={1} y={17} width={14} height={2} fill="#000" opacity={0.08} />
      {/* 목 */}
      <rect x={6} y={14} width={4} height={4} fill={skin} />
      {/* 머리 */}
      <rect x={3} y={3} width={10} height={12} fill={skin} />
      <rect x={3} y={13} width={10} height={2} fill="#000" opacity={0.07} />
      {/* 머리카락 */}
      <rect x={2} y={1} width={12} height={5} fill={hair} />
      <rect x={1} y={3} width={2} height={long ? 12 : 6} fill={hair} />
      <rect x={13} y={3} width={2} height={long ? 12 : 6} fill={hair} />
      {long && <rect x={2} y={13} width={12} height={2} fill={hair} opacity={0.85} />}
      {/* 눈 */}
      {asleep ? (
        <>
          <rect x={5} y={9} width={2} height={1} fill={PALETTE.ink} />
          <rect x={9} y={9} width={2} height={1} fill={PALETTE.ink} />
        </>
      ) : (
        <>
          <rect x={5} y={8} width={2} height={2} fill={PALETTE.ink} />
          <rect x={9} y={8} width={2} height={2} fill={PALETTE.ink} />
        </>
      )}
      {glasses && (
        <g fill="none" stroke={PALETTE.ink} strokeWidth={1}>
          <rect x={4} y={7} width={4} height={4} />
          <rect x={8} y={7} width={4} height={4} />
        </g>
      )}
      {/* 입 */}
      <rect x={7} y={11} width={2} height={1} fill={PALETTE.ink} opacity={0.6} />
      {/* 서 있으면 다리 */}
      {!sitting && (
        <>
          <rect x={4} y={30} width={3} height={5} fill="#3E4A3A" />
          <rect x={9} y={30} width={3} height={5} fill="#3E4A3A" />
        </>
      )}
      {asleep && (
        <text x={16} y={4} fontSize={7} fill={PALETTE.ink} opacity={0.6}>z</text>
      )}
    </g>
  );
}

/** 말풍선 — 지금 만지는 파일 */
export function Bubble({ text, active }: { text: string; active: boolean }) {
  const w = Math.min(TILE * 7.5, 18 + text.length * 5.4);
  return (
    <g shapeRendering="crispEdges">
      <rect x={1} y={2} width={w} height={15} fill="#000" opacity={0.12} />
      <rect x={0} y={0} width={w} height={15} rx={2} fill="#FFFCF2"
            stroke={active ? PALETTE.ink : PALETTE.baseboard} strokeWidth={active ? 1.6 : 1} />
      <rect x={9} y={14} width={5} height={4} fill="#FFFCF2" />
      <rect x={9} y={17} width={5} height={1} fill={active ? PALETTE.ink : PALETTE.baseboard} />
      <text x={6} y={11} fontSize={8.5} fill="#5A4630" fontFamily="ui-monospace, SFMono-Regular, monospace">
        {text}
      </text>
    </g>
  );
}

/** 화분 — 빈 구석을 채우는 소품 */
export function Plant({ seed = 0 }: { seed?: number }) {
  return (
    <g shapeRendering="crispEdges">
      <rect x={2} y={TILE * 1.5} width={TILE * 0.9} height={4} fill={PALETTE.shadow} opacity={0.2} />
      <rect x={3} y={TILE} width={TILE * 0.7} height={TILE * 0.6} fill="#B4622F" />
      <rect x={3} y={TILE} width={TILE * 0.7} height={3} fill="#C8743C" />
      <rect x={4} y={TILE * 0.35} width={4} height={TILE * 0.7} fill="#4F7A46" />
      <rect x={1} y={TILE * 0.15} width={5} height={5} fill="#5E8F52" />
      <rect x={7} y={seed % 2 ? TILE * 0.05 : TILE * 0.3} width={5} height={5} fill="#6FA35F" />
      <rect x={4} y={0} width={4} height={4} fill="#5E8F52" />
    </g>
  );
}

/** 소파 — 라운지용 */
export function Couch() {
  return (
    <g shapeRendering="crispEdges">
      <rect x={2} y={TILE * 1.9} width={TILE * 4} height={4} fill={PALETTE.shadow} opacity={0.2} />
      <rect x={0} y={TILE * 0.3} width={TILE * 4} height={TILE * 1.0} fill="#7E6A8E" />
      <rect x={0} y={TILE * 1.1} width={TILE * 4} height={TILE * 0.8} fill="#8F7A9E" />
      <rect x={0} y={TILE * 0.3} width={TILE * 0.5} height={TILE * 1.6} fill="#6E5A7E" />
      <rect x={TILE * 3.5} y={TILE * 0.3} width={TILE * 0.5} height={TILE * 1.6} fill="#6E5A7E" />
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 직원 신원 — 이름과 직급.
//
// 한나 2026-08-29: "각자의 직급도 있어야 되고 이름도 있어야 되고,
// 지금은 너무 길게 써져 있어서 모르잖아."
//
// 긴 시스템 이름(예: "코덱스 — 하루기록 원장 생성")은 명찰에 안 들어간다.
// 사람 이름 + 직급을 크게 걸고, 진짜 정체는 명찰 아랫줄의 짧은 id로 남긴다.
// 직급은 장식이 아니다 — 이 사람 산출물을 몇 명이 쓰는지로 정한다.
// ─────────────────────────────────────────────────────────────────────

const GIVEN_NAMES = [
  "민준", "서연", "지훈", "하은", "도윤", "수아", "현우", "예린", "준호", "채원",
  "지우", "나라", "태윤", "소율", "건우", "다인", "시우", "유나", "성민", "가온",
  "재이", "루아", "한결", "초아", "은우", "지안", "우진", "미르", "나윤", "정후",
  "새봄", "리오",
];

export interface Rank {
  label: string;
  color: string;
}

/** 이 사람 산출물을 몇 명이 쓰나 → 직급. 영향력이 곧 계급이다. */
export function rankOf(outDegree: number, isSink: boolean): Rank {
  if (isSink) return { label: "창구", color: "#4E6272" };
  if (outDegree >= 7) return { label: "팀장", color: "#7A4E2E" };
  if (outDegree >= 4) return { label: "과장", color: "#8A6A2E" };
  if (outDegree >= 2) return { label: "대리", color: "#4F6B45" };
  if (outDegree >= 1) return { label: "사원", color: "#5A6B7A" };
  return { label: "인턴", color: "#7A7A70" };
}

/** id로 고정된 이름. 새로고침해도 같은 사람은 같은 이름이어야 한다. */
export function nameOf(id: string, taken: Set<string>): string {
  let i = hashOf(id) % GIVEN_NAMES.length;
  for (let step = 0; step < GIVEN_NAMES.length; step += 1) {
    const pick = GIVEN_NAMES[(i + step) % GIVEN_NAMES.length];
    if (!taken.has(pick)) {
      taken.add(pick);
      return pick;
    }
  }
  return GIVEN_NAMES[i];
}

/** 서 있는 자세 — 다리가 보이고 살짝 좁다. */
export function PersonStanding({
  seed, status, glasses = false,
}: { seed: number; status: string; glasses?: boolean }) {
  return (
    <g shapeRendering="crispEdges">
      <ellipse cx={8} cy={36} rx={7} ry={2.5} fill={PALETTE.shadow} opacity={0.25} />
      <rect x={4} y={30} width={3} height={6} fill="#3E4A3A" />
      <rect x={9} y={30} width={3} height={6} fill="#3E4A3A" />
      <Person seed={seed} status={status} sitting glasses={glasses} />
    </g>
  );
}

/** 파일을 들고 가는 사람 — 손에 서류를 쥔다. */
export function Courier({ seed, tint }: { seed: number; tint: string }) {
  const hair = HAIR[(seed >> 3) % HAIR.length];
  const skin = SKIN[seed % SKIN.length];
  return (
    <g shapeRendering="crispEdges">
      <ellipse cx={8} cy={35} rx={6} ry={2} fill="#000" opacity={0.18} />
      <rect x={4} y={29} width={3} height={6} fill="#3E4A3A" />
      <rect x={9} y={29} width={3} height={6} fill="#3E4A3A" />
      <rect x={2} y={16} width={12} height={13} fill={tint} />
      <rect x={6} y={13} width={4} height={4} fill={skin} />
      <rect x={3} y={2} width={10} height={12} fill={skin} />
      <rect x={2} y={0} width={12} height={5} fill={hair} />
      <rect x={1} y={2} width={2} height={6} fill={hair} />
      <rect x={13} y={2} width={2} height={6} fill={hair} />
      <rect x={5} y={7} width={2} height={2} fill={PALETTE.ink} />
      <rect x={9} y={7} width={2} height={2} fill={PALETTE.ink} />
      {/* 손에 든 서류 */}
      <rect x={13} y={19} width={9} height={11} fill="#FFFCF2" stroke={PALETTE.ink} strokeWidth={0.8} />
      <rect x={15} y={22} width={5} height={1} fill="#9A8A70" />
      <rect x={15} y={25} width={5} height={1} fill="#9A8A70" />
    </g>
  );
}

/** 커피 코너 — 사람이 서 있을 구실 */
export function CoffeeBar() {
  return (
    <g shapeRendering="crispEdges">
      <rect x={2} y={TILE * 1.8} width={TILE * 3} height={4} fill={PALETTE.shadow} opacity={0.2} />
      <rect x={0} y={TILE * 0.9} width={TILE * 3} height={TILE} fill="#9A7550" />
      <rect x={0} y={TILE * 0.9} width={TILE * 3} height={4} fill="#B08C63" />
      <rect x={TILE * 0.4} y={TILE * 0.1} width={TILE * 0.8} height={TILE * 0.85} fill="#4A4F46" />
      <rect x={TILE * 0.55} y={TILE * 0.3} width={TILE * 0.5} height={TILE * 0.3} fill="#C96A4A" />
      <rect x={TILE * 1.7} y={TILE * 0.55} width={TILE * 0.4} height={TILE * 0.4} fill="#EDE4CE" />
      <rect x={TILE * 2.3} y={TILE * 0.55} width={TILE * 0.4} height={TILE * 0.4} fill="#EDE4CE" />
    </g>
  );
}
