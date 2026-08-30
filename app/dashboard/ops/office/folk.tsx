// 새벽 길드 사람들.
//
// 한나 2026-08-29: "다 똑같이 규격 맞춰 앉아 있잖아. 더 다양하게 꾸며 줘야 돼.
// 일을 할 때만 움직이고 일을 안 할 때는 안 움직이겠지."
//
// 그래서 —
//  · 직군마다 옷과 도구가 다르다. 채집꾼은 밀짚모자와 자루, 장인은 앞치마와 망치,
//    전령은 망토와 두루마리. 한눈에 무슨 일 하는 사람인지 보여야 한다.
//  · 자세가 곧 상태다. 일하는 사람만 움직인다 — 캐고, 두드리고, 쓴다.
//    쉬는 사람은 정말 가만히 있는다. 애니메이션은 상태의 표현이지 장식이 아니다.
//  · 생김새는 id 해시로 고정. 새로고침해도 같은 사람은 같은 얼굴이다.

import { TILE, hashOf } from "./sprites";
import { LAND } from "./world";

export type Craft = "gatherer" | "artisan" | "courier";
export type Mood = "working" | "idle" | "resting";

const SKIN = ["#F0C79E", "#DEAE86", "#C68F68", "#F6DAB9", "#B87C58"];
const HAIR = ["#2E241C", "#6B4526", "#8A5A2B", "#3A3340", "#5A4A3A", "#A88A5C", "#7A3A3A"];
const CLOAK = ["#5E6E52", "#6A5A78", "#4E6272", "#7A5A42", "#5A6E6A"];
const APRON = ["#8A5A3A", "#6E5A46", "#7A4A4A"];

export interface Look {
  skin: string;
  hair: string;
  cloak: string;
  apron: string;
  hat: 0 | 1 | 2;      // 0 없음 · 1 밀짚 · 2 후드
  long: boolean;
  beard: boolean;
}

export function lookOf(id: string): Look {
  const h = hashOf(id);
  return {
    skin: SKIN[h % SKIN.length],
    hair: HAIR[(h >> 3) % HAIR.length],
    cloak: CLOAK[(h >> 6) % CLOAK.length],
    apron: APRON[(h >> 9) % APRON.length],
    hat: ((h >> 11) % 3) as 0 | 1 | 2,
    long: (h >> 13) % 3 === 0,
    beard: (h >> 15) % 4 === 0,
  };
}

/** 머리 — 모든 직군 공통. 모자·머리길이·수염으로 갈린다. */
function Head({ look, mood }: { look: Look; mood: Mood }) {
  return (
    <g>
      <rect x={3} y={3} width={10} height={11} fill={look.skin} />
      <rect x={3} y={12} width={10} height={2} fill="#000" opacity={0.07} />
      <rect x={2} y={1} width={12} height={5} fill={look.hair} />
      <rect x={1} y={3} width={2} height={look.long ? 11 : 5} fill={look.hair} />
      <rect x={13} y={3} width={2} height={look.long ? 11 : 5} fill={look.hair} />
      {look.hat === 1 && (
        <>
          <rect x={-2} y={2} width={20} height={3} fill="#C9A55E" />
          <rect x={2} y={-2} width={12} height={5} fill="#D8B96E" />
        </>
      )}
      {look.hat === 2 && (
        <>
          <rect x={1} y={0} width={14} height={7} fill={look.cloak} />
          <rect x={0} y={4} width={3} height={9} fill={look.cloak} />
          <rect x={13} y={4} width={3} height={9} fill={look.cloak} />
          <rect x={3} y={5} width={10} height={2} fill="#000" opacity={0.18} />
        </>
      )}
      {mood === "resting" ? (
        <>
          <rect x={5} y={9} width={2} height={1} fill={LAND.ink} />
          <rect x={9} y={9} width={2} height={1} fill={LAND.ink} />
        </>
      ) : (
        <>
          <rect x={5} y={8} width={2} height={2} fill={LAND.ink} />
          <rect x={9} y={8} width={2} height={2} fill={LAND.ink} />
        </>
      )}
      {look.beard && <rect x={5} y={11} width={6} height={3} fill={look.hair} opacity={0.9} />}
      <rect x={7} y={11} width={2} height={1} fill={LAND.ink} opacity={0.5} />
    </g>
  );
}

/**
 * 길드원 한 명.
 * anim 클래스는 mood === "working"일 때만 붙인다 — 일할 때만 움직인다.
 */
export function Folk({
  id, craft, mood,
}: { id: string; craft: Craft; mood: Mood }) {
  const look = lookOf(id);
  const seed = hashOf(id);
  const body =
    craft === "gatherer" ? "#7C8F63" : craft === "artisan" ? look.apron : look.cloak;

  return (
    <g shapeRendering="crispEdges">
      <ellipse cx={8} cy={35} rx={7} ry={2.5} fill={LAND.ink} opacity={0.22} />
      {/* 다리 */}
      <rect x={4} y={29} width={3} height={6} fill="#4A4034" />
      <rect x={9} y={29} width={3} height={6} fill="#4A4034" />
      {/* 몸 */}
      <rect x={2} y={16} width={12} height={13} fill={body} />
      <rect x={2} y={16} width={12} height={2} fill="#fff" opacity={0.1} />
      <rect x={1} y={18} width={2} height={8} fill={body} />
      <rect x={13} y={18} width={2} height={8} fill={body} />
      <rect x={6} y={13} width={4} height={4} fill={look.skin} />

      {/* 직군 표식 */}
      {craft === "gatherer" && (
        <>
          {/* 어깨에 멘 자루 */}
          <rect x={11} y={19} width={7} height={8} fill="#B08A52" />
          <rect x={11} y={19} width={7} height={2} fill="#C9A268" />
          <rect x={3} y={18} width={11} height={2} fill="#6E5A3E" />
        </>
      )}
      {craft === "artisan" && (
        <>
          {/* 앞치마 + 고글 */}
          <rect x={4} y={20} width={8} height={9} fill="#C9B08A" />
          <rect x={4} y={20} width={8} height={2} fill="#DCC69E" />
          <rect x={2} y={2} width={12} height={3} fill={LAND.iron} opacity={0.9} />
        </>
      )}
      {craft === "courier" && (
        <>
          {/* 망토 자락 */}
          <rect x={0} y={17} width={16} height={12} fill={look.cloak} />
          <rect x={0} y={17} width={16} height={2} fill="#fff" opacity={0.08} />
          <rect x={6} y={17} width={4} height={12} fill="#000" opacity={0.1} />
        </>
      )}

      <Head look={look} mood={mood} />

      {/* 손에 든 도구 — 일하는 사람만 */}
      {mood === "working" && craft === "gatherer" && (
        <g className="gd-swing" style={{ transformOrigin: "2px 20px" }}>
          <rect x={-4} y={14} width={3} height={13} fill="#6E4A2A" />
          <rect x={-7} y={12} width={9} height={3} fill={LAND.ironLight} />
        </g>
      )}
      {mood === "working" && craft === "artisan" && (
        <g className="gd-hammer" style={{ transformOrigin: "16px 20px" }}>
          <rect x={15} y={14} width={3} height={11} fill="#6E4A2A" />
          <rect x={13} y={11} width={8} height={5} fill={LAND.iron} />
        </g>
      )}
      {mood === "working" && craft === "courier" && (
        <rect x={14} y={19} width={8} height={10} fill="#EFE6CE" stroke={LAND.ink} strokeWidth={0.8} />
      )}
      {seed % 5 === 0 && mood === "idle" && (
        <rect x={14} y={20} width={5} height={6} fill="#C96A4A" />
      )}
    </g>
  );
}

/** 나르는 사람 — 짐을 지고 길을 걷는다. 걸을 때만 존재한다. */
// 짐꾼 — 마을 사람과 같은 옷 표를 쓰면 "저 사람이 또 있네"로 읽힌다
// (한나 2026-08-30 "사람 복제야???"). 후드 망토 한 벌로 통일해서 역할이 먼저 보이게 한다.
const COURIER = {
  cloak: "#3E5A6E",     // 짙은 청록 망토 — 마을 옷 표에 없는 색
  hood:  "#2E4553",
  trim:  "#C9A24A",     // 금색 띠 — 전령 표식
  skin:  "#E8C9A8",
  boot:  "#2A2420",
};

export function Runner({ id, craft }: { id: string; craft: Craft }) {
  const step = hashOf(id) % 2;                    // 걸음 위상만 사람마다 다르다
  return (
    <g shapeRendering="crispEdges">
      <ellipse cx={8} cy={35} rx={7} ry={2.5} fill={LAND.ink} opacity={0.22} />
      {/* 다리 — 걸음이 엇갈리게 */}
      <rect x={4} y={29} width={3} height={6 - step} fill={COURIER.boot} />
      <rect x={9} y={29} width={3} height={5 + step} fill={COURIER.boot} />
      {/* 망토 — 아래가 넓다 */}
      <rect x={1} y={17} width={14} height={12} fill={COURIER.cloak} />
      <rect x={0} y={26} width={16} height={3} fill={COURIER.hood} />
      <rect x={1} y={21} width={14} height={2} fill={COURIER.trim} opacity={0.85} />
      {/* 후드 — 얼굴이 반쯤 가려진다. 마을 사람 얼굴 표를 안 쓴다 */}
      <rect x={3} y={7} width={11} height={11} fill={COURIER.hood} />
      <rect x={5} y={11} width={7} height={5} fill={COURIER.skin} />
      <rect x={6} y={12} width={2} height={2} fill="#2A2420" />
      <rect x={10} y={12} width={2} height={2} fill="#2A2420" />
      <rect x={2} y={6} width={13} height={3} fill={COURIER.cloak} />
      {/* 짐 — 빛나는 조각을 담은 상자 */}
      <rect x={14} y={18} width={11} height={11} fill="#8A6039" />
      <rect x={14} y={18} width={11} height={3} fill="#A8794C" />
      <rect x={17} y={14} width={5} height={5} fill="#A8CBE6" />
      <rect x={18} y={12} width={3} height={4} fill="#D8E8F4" opacity={0.9} />
      <rect x={14} y={23} width={11} height={2} fill="#6E4A2A" />
      <title>{`짐꾼 — ${craft}`}</title>
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 사고 표현 — 길드원이 한나에게 주의를 준다.
//
// 한나 2026-08-29: "문제가 생기면 이 길드원이 나한테 주의를 주는 거야,
// 쓰러져 있다든지."
//
// 상태를 색으로만 알리면 27명 중에서 못 찾는다. 자세가 달라야 눈에 걸린다.
// 쓰러진 사람은 누워 있고, 지친 사람은 무릎을 꿇고, 조는 사람은 앉아 있다.
// ─────────────────────────────────────────────────────────────────────

export type Trouble =
  | "none" | "down" | "tired" | "asleep" | "lost" | "calling"
  // 한나 2026-08-30 "새로 생기면? 없어지면?" — 명단 변화도 사건이다.
  | "rookie"   // 실재하는데 지도에 안 적힌 잡. 자동 편입된 신입.
  | "gone";    // 지도엔 있는데 설정이 사라진 잡. 자리만 남았다.

/** 판정 → 자세. ops_monitor의 verdict를 그대로 받는다. */
export function troubleOf(alarm: string, manual: boolean, auto = false): Trouble {
  if (auto) return "rookie";
  if (alarm === "down" || alarm === "silent") return "down";
  if (alarm === "late") return "tired";
  if (alarm === "idle") return "asleep";
  if (alarm === "gone") return "gone";
  if (alarm === "unknown") return "lost";
  if (manual) return "calling";
  return "none";
}

export const TROUBLE_MARK: Record<Trouble, { mark: string; color: string; say: string }> = {
  none:    { mark: "",   color: "",        say: "" },
  down:    { mark: "❗", color: "#C2412B", say: "쓰러졌어" },
  tired:   { mark: "❗", color: "#C98A2E", say: "밀렸어" },
  asleep:  { mark: "💤", color: "#6E7A8A", say: "일이 안 와" },
  lost:    { mark: "❓", color: "#7A6E58", say: "확인이 안 돼" },
  calling: { mark: "✋", color: "#8A5A1A", say: "네 손이 필요해" },
  rookie:  { mark: "🆕", color: "#3E7A5A", say: "나 뭐 하는 애인지 안 적혔어" },
  gone:    { mark: "🚪", color: "#6B4A7A", say: "설정이 사라졌어" },
};

/** 쓰러진 길드원 — 누워 있다. 한눈에 이상하다는 게 보여야 한다. */
export function Fallen({ id }: { id: string }) {
  const look = lookOf(id);
  return (
    <g shapeRendering="crispEdges">
      <ellipse cx={18} cy={30} rx={18} ry={4} fill={LAND.ink} opacity={0.25} />
      {/* 옆으로 누운 몸 */}
      <rect x={6} y={20} width={22} height={10} fill={look.cloak} />
      <rect x={6} y={20} width={22} height={2} fill="#fff" opacity={0.08} />
      {/* 다리 */}
      <rect x={26} y={24} width={9} height={4} fill="#4A4034" />
      <rect x={26} y={19} width={8} height={4} fill="#4A4034" />
      {/* 머리 */}
      <rect x={0} y={18} width={11} height={11} fill={look.skin} />
      <rect x={-1} y={16} width={12} height={5} fill={look.hair} />
      {/* 감은 눈 */}
      <rect x={2} y={23} width={3} height={1} fill={LAND.ink} />
      <rect x={7} y={23} width={3} height={1} fill={LAND.ink} />
      {/* 떨어뜨린 도구 */}
      <rect x={30} y={27} width={12} height={3} fill="#6E4A2A" />
      <rect x={40} y={24} width={6} height={5} fill={LAND.ironLight} />
    </g>
  );
}

/** 지친 길드원 — 무릎을 꿇고 있다. 일은 하는데 밀렸다. */
export function Weary({ id }: { id: string }) {
  const look = lookOf(id);
  return (
    <g shapeRendering="crispEdges">
      <ellipse cx={8} cy={33} rx={8} ry={3} fill={LAND.ink} opacity={0.22} />
      <rect x={2} y={26} width={13} height={6} fill="#4A4034" />
      <rect x={2} y={17} width={12} height={10} fill={look.cloak} />
      <rect x={1} y={19} width={2} height={7} fill={look.cloak} />
      <rect x={6} y={14} width={4} height={4} fill={look.skin} />
      <g transform="translate(0,3)">
        <rect x={3} y={3} width={10} height={11} fill={look.skin} />
        <rect x={2} y={1} width={12} height={5} fill={look.hair} />
        <rect x={5} y={9} width={2} height={1} fill={LAND.ink} />
        <rect x={9} y={9} width={2} height={1} fill={LAND.ink} />
      </g>
    </g>
  );
}

/** 조는 길드원 — 앉아서 존다. 일이 안 와서 할 게 없다. */
export function Dozing({ id }: { id: string }) {
  const look = lookOf(id);
  return (
    <g shapeRendering="crispEdges">
      <ellipse cx={8} cy={33} rx={8} ry={3} fill={LAND.ink} opacity={0.2} />
      <rect x={2} y={22} width={14} height={10} fill={look.cloak} />
      <rect x={6} y={19} width={4} height={4} fill={look.skin} />
      <g transform="translate(1,8)">
        <rect x={3} y={3} width={10} height={11} fill={look.skin} />
        <rect x={2} y={1} width={12} height={5} fill={look.hair} />
        <rect x={5} y={9} width={2} height={1} fill={LAND.ink} />
        <rect x={9} y={9} width={2} height={1} fill={LAND.ink} />
      </g>
    </g>
  );
}
