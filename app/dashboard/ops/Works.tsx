"use client";

// 새벽 공방 — 관제탑 본화면.
//
// 한나 2026-08-29의 요구를 전부 한 판에 넣었다:
//
//  1. 중요/단순을 공간으로 가른다
//     살아 있으면 자기 갈래 구역, 꺼져 있으면 창고 한 채 (한나 2026-08-30),
//     꺼둔 것은 창고. 52개를 줄이는 게 아니라 자리를 다르게 준다.
//     ("저들은 자동화가 몇 개 없지만 나는 많잖아")
//
//  2. 이름표는 없애는 게 아니라 토글 (팩토리오 Alt 모드)
//     평소엔 마을만 보이고, 누르면 전부 뜬다. 마우스를 올리면 그것만 뜬다.
//
//  3. 연결은 걸어다니는 짐꾼 (벨트는 걷어냈다 — 한나: "너무 꼬이고 꼬였어")
//     평소엔 잔잔히 오가고, 버스에 새 소식이 오면 그 길을 한 번 실제로 뛴다.
//
//  4. 카메라 — 확대·이동, 고른 사람에게 맞추기
//
//  5. 콘솔 껍데기 — 게임 UI는 그림이 아니라 테두리·모노대문자·패널에서 나온다
//
//  6. 성장 — 누적 실행이 경험치, 등급이 오른다. 매일 볼 이유를 만든다.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { OpsGraph } from "./FlowGraphView";
import { TILE, hashOf } from "./office/sprites";
import {
  BrewStation, Bush, Flowers, ForgeStation, GatherStation, LAND, Lantern, Log,
  LoomStation, PostStation, Rock, Signpost, Tree,
} from "./office/world";
import { Building, Fence, Foreground } from "./office/buildings";
import { BELT_KEYFRAMES } from "./office/belt";
import {
  Dozing, Fallen, Folk, Runner, TROUBLE_MARK, Weary, troubleOf,
  type Craft, type Mood, type Trouble,
} from "./office/folk";

export interface WorksEvent {
  at: string; source: string; summary: string; type: string;
}
export interface CodexJob {
  id: string; name: string; schedule: string; active: boolean;
  verdict: string; reason: string; last_run: string | null; zone: number; runs: number;
  field?: string;
}
export interface ChainLite { name: string; steps: Array<{ id: string }> }

// ── 공간 ────────────────────────────────────────────────────────
// 칸을 좁힌다. 넓게 잡으면 마을이 4000px이 되고, 폭에 맞추느라 ×0.42로 줄어
// 사람이 13px짜리 점이 된다 (한나 2026-08-30 "너무 작아서 보이지도 않아").
const CELL_W = TILE * 4.4;
const CELL_H = TILE * 4.8;
const SKY_H = TILE * 5.5;
const PAD = TILE * 1.5;


// 여덟 갈래. 순서는 한나가 자주 보는 것부터.
const DISTRICTS = [
  { key: "reels",     name: "영상 공방",  hint: "릴스를 만든다",     craft: "artisan"  as Craft,
    ground: "#7E8A5C", kind: "workshop" as const, cols: 3 },
  { key: "voice_out", name: "귀 기울이는 곳", hint: "반응을 모은다", craft: "gatherer" as Craft,
    ground: "#6E8A55", kind: "barn"     as const, cols: 3 },
  { key: "self",      name: "생각 창고",  hint: "내 말을 남긴다",    craft: "artisan"  as Craft,
    ground: "#8A8060", kind: "workshop" as const, cols: 3 },
  { key: "ops",       name: "관제소",     hint: "나머지를 돌본다",   craft: "courier"  as Craft,
    ground: "#A9A08C", kind: "tower"    as const, cols: 3 },
  { key: "dm",        name: "우편소",     hint: "DM을 나른다",       craft: "courier"  as Craft,
    ground: "#9E9683", kind: "tower"    as const, cols: 3 },
  { key: "library",   name: "도서관",     hint: "책을 들인다",       craft: "artisan"  as Craft,
    ground: "#8E8A80", kind: "workshop" as const, cols: 3 },
  { key: "health",    name: "약방",       hint: "몸을 본다",         craft: "gatherer" as Craft,
    ground: "#6A8A72", kind: "barn"     as const, cols: 2 },
  { key: "shop",      name: "가게",       hint: "돈이 오간다",       craft: "courier"  as Craft,
    ground: "#A08A6E", kind: "tower"    as const, cols: 2 },
] as const;

// 한 줄에 넷씩 두 줄로 앉힌다. 여덟을 가로로 늘리면 화면이 옆으로만 길어진다.
const ROW_LEN = 4;
const DISTRICT_BY_KEY = new Map(DISTRICTS.map((d) => [d.key as string, d]));
const districtOf = (field?: string) =>
  (field && DISTRICT_BY_KEY.has(field) ? field : "ops");

const NAMES = [
  "룬", "벨", "델", "오르", "키라", "아렌", "미르", "세인", "노아", "리프",
  "타라", "이든", "요른", "실바", "카일", "로안", "나린", "에리", "하윈", "시온",
  "다온", "레아", "페른", "소른", "헤인", "무나", "로하", "티안", "유이", "칸",
  "아리", "베른", "솔", "핀", "라온", "메이", "쿠온", "다르", "이리", "샤인",
  "노른", "테아", "우르", "빈", "카론", "여울", "하르", "미온", "제이", "루안",
  "가온", "루미", "세라", "온",
];

const GRADE_COLOR: Record<string, string> = {
  전설: "#8A4E2E", 수석: "#7A4E6E", 명장: "#8A6A2E",
  장인: "#3F5F45", 도제: "#4E6272", 견습: "#7A7A70",
};

interface Worker {
  id: string; short: string; label: string; note: string;
  tier: 1 | 2 | 3; district: string; status: string; alarm: string;
  trouble: Trouble; manual: boolean; byCodex: boolean;
  name: string; grade: string; xp: number; seed: number;
  craft: Craft; mood: Mood; x: number; y: number;
}

function fileTag(p: string) {
  const parts = p.split("/").filter(Boolean);
  return parts[parts.length - 1] || p;
}


// 버스 출처 → 마을 사람. 출처는 자동화가 스스로 붙인 이름이라 노드 id와 다를 수 있다.
// 못 찾으면 조용히 무시한다 — 모르는 출처 때문에 화면이 깜빡이면 안 된다.
const BUS_ALIAS: Record<string, string> = {
  "파수꾼": "morning-watchdog",
  "관제탑": "대시보드",
  "library-health": "health-check",
  "mentor-monitor": "yoonsojung-monitor",     // 윤소정 감시
  "youtube-monitor": "youtube-monitor",       // 노정석 감시
  "edu-trend": "edu-trend",
  "reels-monitor": "reels-monitor",
};

const PULSE_MS = 12_000;      // 반짝이는 시간. 짐꾼이 길을 다 건널 만큼.
const REFRESH_MS = 45_000;    // 새 소식을 가지러 가는 주기.


const BLOCK = TILE * 1.5;          // 지형 타일. 작을수록 곱지만 도형이 많아진다
const BASE_GROUND = "#6F8A57";     // 마을 전체를 덮는 잔디

/** 타일 격자에 그린 유기적 얼룩 — 매끈한 타원 대신 들쭉날쭉한 픽셀 가장자리. */
function Patch({ x, y, w, h, color, seed, opacity = 1 }: {
  x: number; y: number; w: number; h: number;
  color: string; seed: string; opacity?: number;
}) {
  const cols = Math.ceil(w / BLOCK) + 4;
  const rows = Math.ceil(h / BLOCK) + 4;
  const ox = x - BLOCK * 2;
  const oy = y - BLOCK * 2;
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const tiles: Array<[number, number]> = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const nx = (c - cx) / (cols / 2);
      const ny = (r - cy) / (rows / 2);
      // 해시 잡음으로 반지름을 흔든다 — 매끈한 타원이 아니라 손으로 뜯은 가장자리
      const noise = ((hashOf(`${seed}:${r}:${c}`) % 100) / 100 - 0.5) * 0.34;
      if (Math.hypot(nx, ny) + noise < 0.92) tiles.push([c, r]);
    }
  }
  return (
    <g opacity={opacity} shapeRendering="crispEdges">
      {tiles.map(([c, r], i) => (
        <rect key={i} x={ox + c * BLOCK} y={oy + r * BLOCK}
              width={BLOCK + 0.5} height={BLOCK + 0.5} fill={color} />
      ))}
    </g>
  );
}

/** 흙길 — 구역과 구역 사이를 지난다. 길이 곧 경계다. */
function Trail({ from, to, seed }: {
  from: { x: number; y: number }; to: { x: number; y: number }; seed: string;
}) {
  const steps = Math.max(4, Math.round(Math.hypot(to.x - from.x, to.y - from.y) / BLOCK));
  const tiles: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const wobble = ((hashOf(`${seed}w${i}`) % 5) - 2) * BLOCK * 0.5;
    const px = from.x + (to.x - from.x) * t;
    const py = from.y + (to.y - from.y) * t + wobble;
    tiles.push([Math.round(px / BLOCK) * BLOCK, Math.round(py / BLOCK) * BLOCK]);
    if (hashOf(`${seed}b${i}`) % 3 === 0) {
      tiles.push([Math.round(px / BLOCK) * BLOCK, Math.round(py / BLOCK) * BLOCK + BLOCK]);
    }
  }
  return (
    <g shapeRendering="crispEdges" opacity={0.55}>
      {tiles.map(([px, py], i) => (
        <rect key={i} x={px} y={py} width={BLOCK + 0.5} height={BLOCK + 0.5} fill="#9A8A6E" />
      ))}
    </g>
  );
}

export default function Works({
  graph, feed, codex = [], chains = [], growth,
}: {
  graph: OpsGraph;
  feed: WorksEvent[];
  codex?: CodexJob[];
  chains?: ChainLite[];
  growth?: { total_runs?: number; grades?: Record<string, string> };
}) {
  const [picked, setPicked] = useState<string | null>(null);

  // ── 살아 있는 반짝임 ────────────────────────────────
  // 화면을 켜둔 채로 새 소식을 받아온다. Next의 서버 컴포넌트를 다시 태우는 방식이라
  // 브라우저가 FastAPI 키를 알 필요가 없다.
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(t);
  }, [router]);

  // 처음 열었을 때 쌓여 있던 72시간치가 한꺼번에 터지면 안 된다 — 전부 '본 것'으로 둔다.
  const seen = useRef<Set<string> | null>(null);
  const [pulses, setPulses] = useState<Record<string, number>>({});

  useEffect(() => {
    const keys = feed.map((e) => `${e.at}|${e.source}`);
    if (seen.current === null) { seen.current = new Set(keys); return; }
    const fresh = feed.filter((e) => !seen.current!.has(`${e.at}|${e.source}`));
    if (!fresh.length) return;
    fresh.forEach((e) => seen.current!.add(`${e.at}|${e.source}`));
    const now = Date.now();
    setPulses((prev) => {
      const next = { ...prev };
      for (const e of fresh) {
        const id = BUS_ALIAS[e.source] ?? e.source;
        next[id] = now;
      }
      return next;
    });
  }, [feed]);

  // 다 타버린 반짝임은 지운다 — 안 지우면 계속 빛난다.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!Object.keys(pulses).length) return;
    const t = setInterval(() => {
      const now = Date.now();
      setPulses((prev) => {
        const next = Object.fromEntries(
          Object.entries(prev).filter(([, at]) => now - at < PULSE_MS));
        return Object.keys(next).length === Object.keys(prev).length ? prev : next;
      });
      setTick((n) => n + 1);
    }, 1500);
    return () => clearInterval(t);
  }, [pulses]);

  const isPulsing = (id: string) => pulses[id] !== undefined;


  const [showNames, setShowNames] = useState(false);   // 팩토리오 Alt 모드
  const [hovered, setHovered] = useState<string | null>(null);
  // 0이면 "아직 안 재봤다" — 처음 그릴 때 화면 너비에 맞춰 정한다.
  const [zoom, setZoom] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const [fitted, setFitted] = useState(false);

  const core = useMemo(() => {
    const s = new Set<string>();
    chains.forEach((c) => c.steps.forEach((st) => s.add(st.id)));
    return s;
  }, [chains]);

  // ── 마을 사람 ──────────────────────────────────────────────
  const people = useMemo<Worker[]>(() => {
    const taken = new Set<string>();
    const pick = (id: string) => {
      const start = hashOf(id) % NAMES.length;
      for (let i = 0; i < NAMES.length; i += 1) {
        const nm = NAMES[(start + i) % NAMES.length];
        if (!taken.has(nm)) { taken.add(nm); return nm; }
      }
      return NAMES[start];
    };
    const grade = (xp: number) =>
      xp >= 400 ? "전설" : xp >= 150 ? "수석" : xp >= 60 ? "명장"
      : xp >= 20 ? "장인" : xp >= 5 ? "도제" : "견습";

    const flow = (graph.nodes ?? []).map((n) => {
      const xp = (n as { xp?: number }).xp ?? 0;
      const tier = ((n as { tier?: number }).tier ?? 2) as 1 | 2 | 3;
      return {
        id: n.id, short: n.short ?? n.id, label: n.label, note: n.note ?? "",
        tier, district: districtOf((n as { field?: string }).field),
        status: n.status, alarm: n.alarm ?? "",
        trouble: troubleOf(n.alarm ?? "", n.manual,
                           (n as { auto?: boolean }).auto ?? false),
        manual: n.manual, byCodex: false,
        name: pick(n.id), grade: growth?.grades?.[n.id] ?? grade(xp), xp,
        seed: hashOf(n.id),
        craft: DISTRICT_BY_KEY.get(districtOf((n as { field?: string }).field))!.craft,
        mood: (n.status === "돌음" ? "working"
          : n.status === "멈춤" ? "resting" : "idle") as Mood,
        x: 0, y: 0,
      };
    });

    const fromCodex = codex.map((c) => ({
      id: `codex:${c.id}`,
      // 10글자에서 자르면 뜻이 사라진다 ("instagram-", "T7 video f").
      // 앞의 군더더기만 걷어내고 길면 말줄임표를 붙인다.
      short: (() => {
        const t = c.name.replace(/\s*텔레그램\s*체크\s*/, " ")
          .replace(/\s*Codex\s*/i, " ").replace(/every 2 days/i, "").trim();
        return t.length > 16 ? t.slice(0, 15) + "…" : t;
      })(),
      label: c.name, note: `${c.schedule} · 코덱스`,
      tier: (c.verdict === "stopped" ? 3 : 2) as 1 | 2 | 3,
      district: districtOf(c.field), status: c.verdict === "ok" ? "돌음"
        : c.verdict === "stopped" ? "멈춤" : "조용",
      alarm: c.verdict, trouble: troubleOf(c.verdict, false), manual: false, byCodex: true,
      name: pick(`codex:${c.id}`), grade: grade(c.runs), xp: c.runs,
      seed: hashOf(c.id), craft: DISTRICT_BY_KEY.get(districtOf(c.field))!.craft,
      mood: (c.verdict === "ok" ? "working"
        : c.verdict === "stopped" ? "resting" : "idle") as Mood,
      x: 0, y: 0,
    }));

    return [...flow, ...fromCodex];
  }, [graph.nodes, codex, growth]);

  // ── 배치: 살아 있으면 자기 갈래, 꺼져 있으면 창고 한 채 ──────
  const layout = useMemo(() => {
    const idle = people.filter((p) => p.tier === 3);
    const live = people.filter((p) => p.tier !== 3);

    // 갈래마다 몇 줄이 필요한지 먼저 센다. 사람 수가 갈래마다 달라서
    // 한 줄로 고정하면 어떤 곳은 텅 비고 어떤 곳은 넘친다.
    const cells = DISTRICTS.map((d) => {
      const members = live.filter((p) => p.district === d.key);
      // 사람 수에 맞춰 열을 잡는다. 고정하면 적은 구역이 옆으로도 텅 빈다.
      // 최대 3열. 넷을 넘기면 구역 하나가 화면을 다 먹는다.
      const cols = Math.max(2, Math.min(3, Math.ceil(Math.sqrt(members.length || 1))));
      return { d, members, cols, rows: Math.max(1, Math.ceil(members.length / cols)) };
    });

    // 가로 넷씩 두 줄. 줄마다 가장 키 큰 구역에 높이를 맞춘다.
    const bands: Array<{ items: typeof cells; height: number; top: number }> = [];
    let top = SKY_H;
    for (let i = 0; i < cells.length; i += ROW_LEN) {
      const items = cells.slice(i, i + ROW_LEN);
      // 제일 큰 구역에 맞추되 상한을 둔다 — 7명짜리 옆에 14명짜리가 오면
      // 작은 구역이 세로로 텅 빈다 (한나 스크린샷에서 그랬다).
      const need = Math.max(...items.map((c) => c.rows));
      const height = need * CELL_H + TILE * 5.4;
      bands.push({ items, height, top });
      top += height;
    }

    const zones: Array<{ d: typeof DISTRICTS[number]; members: Worker[]; cols: number;
                         box: { x: number; y: number; width: number; height: number } }> = [];

    // 줄마다 자연 폭이 다르면 짧은 줄 끝에 검은 여백이 남는다 (한나 스크린샷).
    // 제일 긴 줄에 맞추고, 남는 폭은 구역 사이 간격으로 나눠 준다 —
    // 칸을 늘리는 대신 사이를 벌리면 '떨어져 있는 마을'이 된다.
    const natural = bands.map((b) =>
      b.items.reduce((sum, c) => sum + c.cols * CELL_W + PAD * 2, 0));
    const widest = Math.max(...natural.map((n, i) => n + (bands[i].items.length - 1) * TILE))
      + PAD * 2;

    bands.forEach((band, bi) => {
      const gaps = Math.max(1, band.items.length - 1);
      const spare = widest - PAD * 2 - natural[bi];
      const gap = Math.max(TILE, spare / gaps);
      let x = PAD;
      for (const c of band.items) {
        const width = c.cols * CELL_W + PAD * 2;
        zones.push({ d: c.d, members: c.members, cols: c.cols,
                     box: { x, y: band.top, width, height: band.height } });
        x += width + gap;
      }
    });

    const idleTop = top + TILE * 2.2;
    return {
      zones, idle, idleTop,
      width: widest,
      // 사람을 안 그리니 마당은 집 한 채 높이면 된다
      height: idleTop + TILE * 7.5,
    };
  }, [people]);

  const placed = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    layout.zones.forEach(({ members, cols, box }) => {
      members.forEach((p, i) => {
        const j = hashOf(p.id + "pos");
        // 크게 흔든다. ±4px로는 격자가 안 깨진다 — 줄 맞춰 선 좌석표로 보인다.
        // 제목·건물이 앉는 위쪽 띠(TILE*3)는 비워둔다.
        map.set(p.id, {
          x: box.x + PAD + (i % cols) * CELL_W + ((j % 41) - 20),
          y: box.y + TILE * 4.6 + Math.floor(i / cols) * CELL_H + (((j >> 5) % 25) - 12),
        });
      });
    });
    // 창고 — 집 앞마당에 옹기종기. 줄 세우지 않는다, 쉬는 사람들이니까.
    // 꺼둔 것은 창고 '안'에 있다 — 자리를 안 준다.
    // 마당에 앉혀 두면 아직 뭘 하는 것처럼 보인다 (한나 2026-08-30 "안 보이게").
    // 명단은 옆 패널과 창고 문패 숫자로 본다.
    return map;
  }, [layout]);

  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const W = layout.width;
  const H = layout.height;

  // 화면 폭에 맞추는 배율. 마을이 넓어질수록 작아진다.
  const fitZoom = () => {
    const el = scroller.current;
    if (!el || !W) return 1;
    // 소수점 반올림으로 1~2px이 남으면 그게 검은 띠가 된다. 넉넉히 뺀다.
    return Math.max(0.25, Math.min(1, (el.clientWidth - 14) / W));
  };
  useEffect(() => {
    if (fitted || !W) return;
    setZoom(fitZoom());
    setFitted(true);
  }, [W, fitted]);
  useEffect(() => {
    const onResize = () => setZoom(fitZoom());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [W]);

  const working = people.filter((p) => p.status === "돌음").length;

  // 하늘은 실제 시각을 따른다. "아무도 안 돌 때만 밤"으로 뒀더니
  // 33명이 상시 도는 마을에선 영영 밤이 안 왔다 (한나 2026-08-29 "배경이 변경이 안 되고").
  const sky = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5)  return { name: "한밤", top: "#1B2340", bot: "#3A3F5C", dim: 0.62, star: true };
    if (h < 8)  return { name: "새벽", top: "#3E4A72", bot: "#C9906A", dim: 0.82, star: false };
    if (h < 11) return { name: "아침", top: "#8FB6DC", bot: "#E8DCC0", dim: 1, star: false };
    if (h < 17) return { name: "낮",   top: "#7FB0DC", bot: "#CFE0EC", dim: 1, star: false };
    if (h < 20) return { name: "저녁", top: "#6A6C96", bot: "#D9905E", dim: 0.88, star: false };
    return { name: "밤", top: "#232B4A", bot: "#454A6A", dim: 0.68, star: true };
  }, []);
  const nightish = sky.dim < 0.9;
  // 신입은 고장이 아니다 — 실재하는데 지도에 안 적힌 것뿐이다.
  // 경보에 섞으면 진짜 고장이 27건에 파묻힌다 (한나 2026-08-30).
  // '네 손이 필요해'는 고장이 아니라 원래 사람이 하는 자리다.
  // 같이 세면 진짜 고장이 파묻힌다 — 한나 스크린샷에서 6건 중 4건이 그거였다.
  const troubled = people.filter(
    (p) => p.trouble !== "none" && p.trouble !== "rookie" && p.trouble !== "calling");
  const rookies = people.filter((p) => p.trouble === "rookie");
  // 어둠은 하늘·땅 색만 바꾼다. 일손을 놓게 하지 않는다 —
  // 자동화 마을은 새벽 3~6시가 제일 바쁘다 (한나 2026-08-30 선택 A).
  const dark = sky.dim <= 0.7;

  const ties = useMemo(() => {
    if (!picked) return null;
    const s = new Set<string>([picked]);
    (graph.links ?? []).forEach((l) => {
      if (l.from === picked) s.add(l.to);
      if (l.to === picked) s.add(l.from);
    });
    return s;
  }, [picked, graph.links]);

  // ── 짐꾼 ──────────────────────────────────────────────────
  // 벨트를 걷어냈다. 52개를 상시로 그리면 그물이 되어 누가 누구에게 주는지
  // 오히려 안 보인다 (한나 2026-08-29 "너무 꼬이고 꼬였어").
  // 자동화는 계속 일하지 않으니, 지금 실제로 넘어가는 것만 사람이 들고 걸어간다.
  const routes = useMemo(() => (graph.links ?? [])
    .filter((l) => l.from !== l.to && placed.has(l.from) && placed.has(l.to))
    .map((l) => {
      const a = placed.get(l.from)!;
      const b = placed.get(l.to)!;
      const from = byId.get(l.from);
      const to = byId.get(l.to);
      const ax = a.x + TILE * 2;
      const ay = a.y + TILE * 3.6;
      const bx = b.x + TILE * 2;
      const by = b.y + TILE * 3.6;
      const lane = Math.max(ay, by) + TILE * 1.6;
      return {
        key: `${l.from}->${l.to}`, from: l.from, to: l.to,
        file: fileTag(l.files[0]), files: l.files,
        // 자리에서 내려와 → 가로질러 → 상대 자리로. 복도를 걷는 모양.
        d: `M ${ax} ${ay} L ${ax} ${lane} L ${bx} ${lane} L ${bx} ${by}`,
        live: from?.status === "돌음" && to?.status !== "멈춤",
        seed: hashOf(l.from + l.to),
      };
    }), [graph.links, placed, byId]);

  // 한 번에 다섯만. 더 많으면 다시 그물이 된다.
  // 보내는 사람마다 하나씩만 뽑는다 — 안 그러면 한 사람이 짐꾼 다섯을 독차지해
  // "누가 누구에게" 대신 "저 사람만 바쁘다"만 보인다.
  const carriers = useMemo(() => {
    const seenFrom = new Set<string>();
    const picked: typeof routes = [];
    for (const r of [...routes].filter((x) => x.live).sort((a, b) => a.seed - b.seed)) {
      if (seenFrom.has(r.from)) continue;
      seenFrom.add(r.from);
      picked.push(r);
      if (picked.length >= 5) break;
    }
    return picked.map((r, i) => ({ ...r, dur: 13 + (i % 3) * 3, delay: i * 2.4 }));
  }, [routes]);

  const pickedTies = picked ? [
    ...(graph.links ?? []).filter((l) => l.to === picked)
      .map((l) => ({ dir: "받는다", other: l.from, files: l.files })),
    ...(graph.links ?? []).filter((l) => l.from === picked)
      .map((l) => ({ dir: "준다", other: l.to, files: l.files })),
  ] : [];

  const focus = (id: string) => {
    setPicked(id);
    const at = placed.get(id);
    const el = scroller.current;
    if (at && el) {
      const z = zoom || 1;
      el.scrollTo({ left: Math.max(0, at.x * z - el.clientWidth / 2),
                    top: Math.max(0, at.y * z - el.clientHeight / 2), behavior: "smooth" });
    }
  };

  const labelVisible = (id: string) => showNames || hovered === id || picked === id;

  return (
    <div className="flex flex-col xl:flex-row gap-3">
      <style>{`
        ${BELT_KEYFRAMES}
        @keyframes wk-swing { 0%,100%{transform:rotate(0)} 45%{transform:rotate(-38deg)} 60%{transform:rotate(6deg)} }
        @keyframes wk-hammer{ 0%,100%{transform:rotate(0)} 40%{transform:rotate(42deg)} 55%{transform:rotate(-6deg)} }
        @keyframes wk-work  { 0%,100%{transform:translateY(0)} 45%{transform:translateY(-2px)} }
        @keyframes wk-alert { 0%,100%{transform:translateY(0) scale(1)} 40%{transform:translateY(-6px) scale(1.08)} }
        @keyframes wk-carry { from{offset-distance:0%} to{offset-distance:100%} }
        @keyframes wk-step  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        .wk-carry{animation:wk-carry var(--dur) linear infinite}
        .wk-carry > g{animation:wk-step .42s steps(2) infinite}
        @keyframes wk-smoke { 0%{opacity:.5;transform:translateY(0)} 100%{opacity:0;transform:translateY(-15px)} }
        .gd-swing{animation:wk-swing 1.5s ease-in-out infinite}
        .gd-hammer{animation:wk-hammer 1.1s ease-in-out infinite}
        .wk-work{animation:wk-work 1.9s ease-in-out infinite}
        /* 방금 일한 사람 — 동작이 빨라지고 발밑에 물결이 퍼진다 (한나 2026-08-30) */
        .wk-work-fast{animation-duration:.75s}
        @keyframes wk-ring { 0%{opacity:.9;transform:scale(.35)} 100%{opacity:0;transform:scale(1.25)} }
        .wk-pulse ellipse{transform-origin:24px 24px;animation:wk-ring 1.6s ease-out infinite}
        .wk-pulse-b{animation-delay:.8s!important}
        /* 진짜 배달 — 딱 한 번 건넌다. 무한 반복이면 "방금"이라는 뜻이 사라진다. */
        @keyframes wk-dash { from{offset-distance:0%} to{offset-distance:100%} }
        .wk-dash{animation:wk-dash 5.5s cubic-bezier(.4,0,.5,1) 1 forwards}
        .wk-dash > g{animation:wk-step .3s steps(2) infinite}
        @keyframes wk-glow { 0%,100%{opacity:.35} 50%{opacity:.85} }
        .wk-pulse-path{animation:wk-glow 1.1s ease-in-out infinite}
        .wk-alert{animation:wk-alert 1.25s ease-in-out infinite}
        .gd-smoke circle{animation:wk-smoke 3.2s ease-out infinite}
        .gd-smoke circle:nth-child(2){animation-delay:1s}
        .gd-smoke circle:nth-child(3){animation-delay:2s}
        @media (prefers-reduced-motion:reduce){
          .gd-swing,.gd-hammer,.wk-work,.wk-alert,.gd-smoke circle,
          .wk-carry,.wk-carry>g,
          .wk-pulse ellipse,.wk-dash,.wk-dash>g,.wk-pulse-path{animation:none!important}
          /* 움직임을 끈 사람에게도 "방금 일어난 일"은 보여야 한다 — 색으로 알린다 */
          .wk-pulse ellipse{opacity:.8}
          .wk-dash{offset-distance:60%}
          .wk-carry{offset-distance:45%}
        }
        /* 콘솔 껍데기 — 게임 느낌은 그림이 아니라 테두리와 라벨에서 나온다 */
        .wk-console { border: 3px solid #3B4A5A; box-shadow: 0 0 0 3px #8FA6BE inset; }
        .wk-cap { font-family: ui-monospace, SFMono-Regular, monospace;
                  font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; }
        .wk-btn { font-family: ui-monospace, monospace; font-size: 11px; font-weight: 700;
                  padding: 4px 10px; border: 2px solid #3B4A5A; background: #E8EEF4;
                  color: #24303C; cursor: pointer; }
        .wk-btn[aria-pressed="true"] { background: #3B4A5A; color: #F0F4F8; }
      `}</style>

      <div className="flex-1 min-w-0">
        {/* 콘솔 헤더 */}
        <div className="wk-console" style={{ background: "#DCE5EE", padding: "8px 10px" }}>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="wk-cap" style={{ color: "#24303C", fontWeight: 700 }}>
              새벽 공방 · 관제
            </span>
            <span className="wk-cap" style={{ color: "#4E6272" }}>
              {people.length}명 중 {working}명 가동
            </span>
            <span className="wk-cap px-2"
                  style={{ background: troubled.length ? "#C2412B" : "#3F6B45",
                           color: "#fff", padding: "2px 8px" }}>
              {troubled.length ? `주의 ${troubled.length}` : "정상"}
            </span>
            {carriers.length > 0 && (
              <span className="wk-cap px-2"
                    style={{ background: "#3F6B45", color: "#fff", padding: "2px 8px" }}>
                운반 중 {carriers.length}
              </span>
            )}
            <span className="wk-cap ml-auto" style={{ color: "#4E6272" }}>
              누적 {(growth?.total_runs ?? 0).toLocaleString("ko-KR")}회
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button className="wk-btn" aria-pressed={showNames}
                    onClick={() => setShowNames((v) => !v)}>
              이름 {showNames ? "끄기" : "보기"}
            </button>
            <button className="wk-btn" onClick={() => setZoom((z) => Math.min(2, z + 0.25))}>확대 +</button>
            <button className="wk-btn" onClick={() => setZoom((z) => Math.max(0.25, z - 0.15))}>축소 −</button>
            <button className="wk-btn" onClick={() => { setZoom(fitZoom()); setPicked(null); }}>
              한눈에
            </button>
            {/* 45초마다 저절로 새로 오지만, 지금 당장 보고 싶을 때가 있다 */}
            <button className="wk-btn" onClick={() => router.refresh()}>새로고침</button>
            <span className="wk-cap" style={{ color: "#6B7A88" }}>×{(zoom || 1).toFixed(2)}</span>
          </div>
        </div>

        {/* 배경을 땅 색으로 둔다 — 배율이 딱 안 떨어질 때 남는 띠가
            검은 벽처럼 보였다 (한나 2026-08-30 "옆에 선이 남아"). */}
        <div ref={scroller} className="overflow-auto wk-console"
             style={{ background: dark ? "#2A3327" : BASE_GROUND, borderTop: 0,
                      maxHeight: "78vh" }}>
          <svg viewBox={`0 0 ${W} ${H}`}
               width={W * (zoom || 1)} height={H * (zoom || 1)}
               style={{ display: "block", imageRendering: "pixelated" }}
               role="img"
               aria-label={`새벽 공방 — ${people.length}명 중 ${working}명 가동 중`}>

            {/* 하늘 — 지금 시각의 하늘이다 */}
            <defs>
              <linearGradient id="wk-sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={sky.top} />
                <stop offset="100%" stopColor={sky.bot} />
              </linearGradient>
            </defs>
            <rect x={0} y={0} width={W} height={SKY_H} fill="url(#wk-sky)" />
            {sky.star && Array.from({ length: 26 }).map((_, i) => {
              const v = hashOf(`star${i}`);
              return <rect key={i} x={v % Math.max(1, Math.floor(W))}
                           y={(v >> 6) % Math.max(1, Math.floor(SKY_H - 10))}
                           width={2} height={2} fill="#FFF6D8"
                           opacity={0.45 + ((v >> 3) % 5) / 10} />;
            })}
            <circle cx={W - TILE * 5} cy={TILE * 1.6} r={TILE * 0.85}
                    fill={sky.star ? "#EDE6C8" : "#F8E9A8"} opacity={0.92} />
            <text x={PAD} y={TILE * 1.4} className="wk-cap" fontSize={11}
                  fill={sky.star ? "#D8D2C0" : "#3E4A3A"} fontWeight={700}>
              {sky.name}
            </text>
            <rect x={0} y={SKY_H - 5} width={W} height={5} fill={LAND.wood} />

            {/* 땅은 한 장이다. 구역은 그 위에 번진 얼룩으로만 나뉜다. */}
            <rect x={0} y={SKY_H} width={W} height={H - SKY_H}
                  fill={BASE_GROUND} opacity={sky.dim} shapeRendering="crispEdges" />
            {/* 잔디결 — 단색은 잔디밭이 아니라 색종이다 */}
            {Array.from({ length: 260 }).map((_, i) => {
              const v = hashOf(`turf${i}`);
              return <rect key={i} x={v % Math.max(1, Math.floor(W))}
                           y={SKY_H + ((v >> 8) % Math.max(1, Math.floor(H - SKY_H)))}
                           width={3} height={2} fill="#7E9A62" opacity={0.5}
                           shapeRendering="crispEdges" />;
            })}
            {layout.zones.map(({ d, box }) => (
              <Patch key={`p-${d.key}`} x={box.x} y={box.y + TILE}
                     w={box.width} h={box.height - TILE * 1.5}
                     color={d.ground} seed={d.key} opacity={dark ? 0.62 : 0.92} />
            ))}
            {/* 길 — 구역 사이를 지난다. 선을 긋지 않아도 여기가 경계라는 게 보인다. */}
            {/* 들풀·꽃·돌 — 아무 기능 없다. 이게 있어야 땅이 맨바닥으로 안 보인다.
                사람보다 먼저 그려서 밟고 선 것처럼 보이게 한다. */}
            {Array.from({ length: 90 }).map((_, i) => {
              const v = hashOf(`deco${i}`);
              const gx = v % Math.max(1, Math.floor(W - TILE * 2));
              const gy = SKY_H + TILE * 2
                + ((v >> 9) % Math.max(1, Math.floor(layout.idleTop - SKY_H - TILE * 3)));
              const kind = v % 10;
              return (
                <g key={`deco-${i}`} transform={`translate(${gx},${gy})`} opacity={0.95}>
                  {kind < 4 ? <Flowers seed={v} />
                    : kind < 7 ? <Rock seed={v} />
                    : kind < 9 ? <Bush seed={v} />
                    : <Log seed={v} />}
                </g>
              );
            })}

            {/* 구역 사이 틈의 나무·바위 — 담장을 안 쳐도 여기가 경계라는 게 보인다 */}
            {layout.zones.slice(0, -1).flatMap(({ d, box }, i) => {
              const next = layout.zones[i + 1];
              if (!next || next.box.y !== box.y) return [];
              const gapW = next.box.x - (box.x + box.width);
              if (gapW < TILE * 1.5) return [];
              const mid = box.x + box.width + gapW / 2;
              return Array.from({ length: 3 }).map((_, k) => {
                const v = hashOf(`seam${d.key}${k}`);
                const gy = box.y + TILE * 3 + ((v >> 4) % Math.max(1, Math.floor(box.height - TILE * 5)));
                const gx = mid - TILE * 0.6 + ((v % 9) - 4);
                // 여섯 가지를 돌려 심는다. 나무만 세우면 경계마저 반복이 된다
                // (한나 2026-08-30 "나무 말고 다른 것도 만들어줘").
                const kind = v % 6;
                return (
                  <g key={`seam-${d.key}-${k}`} transform={`translate(${gx},${gy})`}>
                    {kind === 0 ? <Tree seed={v} />
                      : kind === 1 ? <Bush seed={v} />
                      : kind === 2 ? <Log seed={v} />
                      : kind === 3 ? <Rock seed={v} />
                      : kind === 4 ? <Flowers seed={v} />
                      : <Signpost seed={v} />}
                  </g>
                );
              });
            })}

            {layout.zones.slice(0, -1).map(({ d, box }, i) => {
              const next = layout.zones[i + 1];
              // 같은 줄 안에서만 잇는다. 줄을 건너뛰면 대각선 길이 마을을 가로지른다.
              if (!next || next.box.y !== box.y) return null;
              return (
                <Trail key={`t-${d.key}`} seed={d.key}
                       from={{ x: box.x + box.width - TILE, y: box.y + box.height * 0.62 }}
                       to={{ x: next.box.x + TILE, y: next.box.y + next.box.height * 0.62 }} />
              );
            })}
            {layout.zones.map(({ d, members, box }) => (
              <g key={d.key}>

                {/* 건물은 구역 안에 앉힌다. 밖으로 걸치면 윗줄 건물이 아랫줄 제목을 덮는다
                    (한나 스크린샷: 우편소·도서관·약방 이름이 가려졌다). */}
                <g transform={`translate(${box.x + box.width - TILE * 7},${box.y + TILE * 0.3})`}>
                  <Building kind={d.kind} w={TILE * 6} h={TILE * 3}
                            // 밤에도 돌고 있으면 창에 불이 켜져 있어야 맞다
                            alive={members.some((p) => p.status === "돌음")}
                            label={`${d.name} ${members.length}`} />
                </g>

                {/* 바닥 잡초·돌 — 단색 바닥은 잔디밭이 아니라 색종이로 보인다 */}
                {Array.from({ length: 14 }).map((_, i) => {
                  const v = hashOf(`${d.key}sp${i}`);
                  const gx = box.x + 16 + (v % Math.max(1, Math.floor(box.width - 32)));
                  const gy = box.y + TILE * 2.4
                    + ((v >> 7) % Math.max(1, Math.floor(box.height - TILE * 4)));
                  if (d.craft === "gatherer") {
                    return (
                      <g key={i} shapeRendering="crispEdges">
                        <rect x={gx} y={gy} width={3} height={5 + (v % 4)} fill="#5C7847" />
                        <rect x={gx + 4} y={gy + 2} width={3} height={4 + (v % 3)} fill="#82A063" />
                      </g>
                    );
                  }
                  return (
                    <rect key={i} x={gx} y={gy} width={5 + (v % 6)} height={3}
                          fill={d.craft === "artisan" ? "#77736A" : "#948D82"} opacity={0.7}
                          shapeRendering="crispEdges" />
                  );
                })}

                {/* 등불 — 어두워지면 켜진다. 밤이라고 일손을 놓게 하는 대신
                    이걸로 밤인 걸 보여준다 (한나 2026-08-30 선택 A). */}
                {dark && [0, 1].map((k) => {
                  const v = hashOf(`${d.key}lamp${k}`);
                  return (
                    <g key={`lamp-${d.key}-${k}`}
                       transform={`translate(${box.x + TILE + (v % Math.max(1, Math.floor(box.width - TILE * 3)))},${box.y + TILE * 4 + ((v >> 6) % Math.max(1, Math.floor(box.height - TILE * 6)))})`}>
                      <Lantern lit />
                    </g>
                  );
                })}

                {(() => {
                  const v = hashOf(d.key + "corner");
                  const at = `translate(${box.x + 6},${box.y + box.height - TILE * 2.6})`;
                  return (
                    <g transform={at}>
                      {v % 4 === 0 ? <Tree seed={v} />
                        : v % 4 === 1 ? <Bush seed={v} />
                        : v % 4 === 2 ? <Flowers seed={v} />
                        : <Log seed={v} />}
                    </g>
                  );
                })()}

                {/* 이름·숫자는 간판에만 둔다. 바닥에 겹쳐 쓴 검은 글자는 안 읽혔다
                    (한나 2026-08-30 "칸 밑에 검정 글자 삭제"). */}
              </g>
            ))}

            {/* 창고 — 꺼둔 것을 한 채에 모은다 (한나 2026-08-30 "집 같은 곳에 모두 넣어두고").
                줄 세워 늘어놓으면 '아직 뭔가 하는 줄' 같아 보인다. 문 닫힌 집 앞이 맞다. */}
            <rect x={0} y={layout.idleTop + BLOCK} width={W} height={H - layout.idleTop - BLOCK}
                  fill="#8E8578" opacity={sky.dim} shapeRendering="crispEdges" />
            {/* 마당 가장자리를 흩뜨린다 — 자로 그은 선은 마을에 없다 */}
            {Array.from({ length: Math.ceil(W / BLOCK) }).map((_, c) => {
              const v = hashOf(`yardedge${c}`);
              return (
                <g key={c} shapeRendering="crispEdges">
                  <rect x={c * BLOCK} y={layout.idleTop + (v % 2 ? 0 : BLOCK * 0.5)}
                        width={BLOCK + 0.5} height={BLOCK} fill="#8E8578" opacity={sky.dim} />
                  {v % 3 === 0 && (
                    <rect x={c * BLOCK} y={layout.idleTop - BLOCK * 0.5}
                          width={BLOCK + 0.5} height={BLOCK * 0.5} fill="#8E8578"
                          opacity={sky.dim * 0.8} />
                  )}
                </g>
              );
            })}
            {Array.from({ length: Math.ceil(W / (TILE * 2)) }).map((_, c) => {
              const v = hashOf(`rest${c}`);
              if (v % 3) return null;
              return <rect key={c} x={c * TILE * 2 + (v % 9)}
                           y={layout.idleTop + TILE * 1.2 + ((v >> 4) % Math.floor(TILE * 5))}
                           width={TILE * 1.1} height={4} fill="#7A7268"
                           opacity={0.6} shapeRendering="crispEdges" />;
            })}
            <g transform={`translate(0,${layout.idleTop})`}>
              <Fence w={W} seed={3} />
            </g>
            <g transform={`translate(${PAD},${layout.idleTop + TILE * 1.2})`}>
              <Building kind="barn" w={TILE * 7} h={TILE * 4.2} alive={false}
                        label={`창고 ${layout.idle.length}`} />
            </g>
            <g transform={`translate(${PAD + TILE * 8},${layout.idleTop + TILE * 0.7})`}>
              <rect width={TILE * 11} height={TILE * 1.35} rx={3} fill="#1F2A22" opacity={0.6} />
              <text x={8} y={15} fontSize={10.5} className="wk-cap"
                    fill="#F2E8CE" fontWeight={700}>
                꺼둔 것 — 문 닫고 안에 있다
              </text>
            </g>

            {/* 길 — 평소엔 안 보인다. 사람을 고르면 그 사람 것만 드러난다. */}
            {picked && routes.filter((r) => r.from === picked || r.to === picked).map((r) => (
              <path key={r.key} d={r.d} fill="none" stroke="#F0D89A"
                    strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
                    opacity={0.85} />
            ))}

            {/* 사람 — 아래쪽이 위를 가리게 */}
            {[...people]
              .sort((a, b) => (placed.get(a.id)?.y ?? 0) - (placed.get(b.id)?.y ?? 0))
              .map((p) => {
                const at = placed.get(p.id);
                if (!at) return null;
                const on = picked === p.id;
                const faded = ties && !ties.has(p.id);
                const busy = p.mood === "working" && p.trouble === "none";
                // 방금 버스에 소식을 남긴 사람 — 이때만 진짜로 뭔가 일어난 것이다.
                const live = isPulsing(p.id);
                const small = p.tier !== 1;
                // 칸이 좁아졌으니 사람은 오히려 키운다. 읽히는 게 먼저다.
                const scale = small ? 1.1 : 1.35;
                return (
                  <g key={p.id} transform={`translate(${at.x},${at.y})`}
                     opacity={faded ? 0.22 : dark ? 0.88 : 1}
                     style={{ cursor: "pointer" }}
                     onClick={() => focus(on ? "" : p.id)}
                     onMouseEnter={() => setHovered(p.id)}
                     onMouseLeave={() => setHovered(null)}>
                    <title>{`${p.short} — ${p.label}\n${p.name} · ${p.grade} · 누적 ${p.xp}회\n${p.note}`}</title>

                    {/* 정기 부스는 차양을 씌운다 — 본구역과 다른 '장터'로 읽히게 */}
                    {p.tier === 2 && (
                      <g shapeRendering="crispEdges">
                        <rect x={-2} y={TILE * 0.35} width={TILE * 3.0} height={TILE * 0.42}
                              fill={["#B4553F", "#4E6E7A", "#8A6A2E", "#5E7A4E"][p.seed % 4]} />
                        <rect x={-2} y={TILE * 0.77} width={TILE * 3.0} height={TILE * 0.2}
                              fill="#000" opacity={0.14} />
                        <rect x={-2} y={TILE * 0.3} width={4} height={TILE * 1.7} fill="#7A6248" />
                        <rect x={TILE * 2.8} y={TILE * 0.3} width={4} height={TILE * 1.7} fill="#7A6248" />
                      </g>
                    )}

                    {/* 지금 막 일한 표시 — 발밑에서 물결이 퍼진다 */}
                    {live && (
                      <g className="wk-pulse" style={{ pointerEvents: "none" }}>
                        <ellipse cx={TILE * 1.5} cy={TILE * 1.5} rx={26} ry={11}
                                 fill="none" stroke="#F2C14E" strokeWidth={2.5} />
                        <ellipse cx={TILE * 1.5} cy={TILE * 1.5} rx={26} ry={11}
                                 fill="none" stroke="#F2C14E" strokeWidth={2}
                                 style={{ animationDelay: "0.8s" }} className="wk-pulse-b" />
                      </g>
                    )}

                    {/* 작업대 — 사람마다 다른 걸 쓴다. 다 같은 책상이면 다 같은 일로 보인다. */}
                    <g transform={`translate(0,${TILE * (small ? 0.55 : 1.0)}) scale(${small ? 0.72 : 1})`}>
                      {p.craft === "gatherer" ? <GatherStation full={busy} />
                        : p.craft === "courier" ? <PostStation ready={busy} />
                        : p.seed % 3 === 0 ? <BrewStation hot={busy} />
                        : p.seed % 3 === 1 ? <LoomStation busy={busy} />
                        : <ForgeStation hot={busy} />}
                    </g>

                    <g transform={`translate(${TILE * (small ? 1.15 : 1.6) + ((p.seed >> 7) % 13) - 6},${TILE * (small ? -0.05 : -0.25) + ((p.seed >> 11) % 9) - 4}) scale(${(p.seed % 5 === 0 ? -1 : 1) * scale},${scale})`}
                       className={live ? "wk-work wk-work-fast" : busy ? "wk-work" : undefined}
                       style={busy || live ? { animationDelay: `${(p.seed % 13) * 0.17}s` } : undefined}>
                      {p.trouble === "down" ? <Fallen id={p.id} />
                        : p.trouble === "tired" ? <Weary id={p.id} />
                        : p.trouble === "asleep" ? <Dozing id={p.id} />
                        : <Folk id={p.id} craft={p.craft} mood={p.mood} />}
                    </g>

                    {/* 주의 — 이름표와 무관하게 항상 뜬다 */}
                    {/* 신입 표식 — 말풍선까지 띄우면 마을 절반이 소리친다 */}
                    {p.trouble === "rookie" && (
                      <g transform={`translate(${TILE * 2.0},${TILE * -0.55})`}>
                        <circle r={3.2} fill="#5FA37C" stroke="#2E5A42" strokeWidth={1} />
                        <title>지도에 안 적힌 잡 — 옆 초록 칸에 명단이 있다</title>
                      </g>
                    )}

                    {/* 말풍선 대신 이모티콘 하나. 글자를 붙이면 폭이 86px이라
                        옆 사람을 덮었다 (한나 2026-08-30 "이모티콘만 표시해줘").
                        뜻은 마우스를 올리면 나온다. */}
                    {p.trouble !== "none" && p.trouble !== "rookie"
                      && p.trouble !== "calling" && (
                      <g transform={`translate(${TILE * 1.55},${TILE * -1.0})`}
                         className="wk-alert">
                        <circle r={9} fill="#FFF8E6"
                                stroke={TROUBLE_MARK[p.trouble].color} strokeWidth={2} />
                        <text y={4.5} fontSize={11} textAnchor="middle">
                          {TROUBLE_MARK[p.trouble].mark}
                        </text>
                        <title>{`${p.short} — ${TROUBLE_MARK[p.trouble].say}`}</title>
                      </g>
                    )}

                    {/* 이름표 — 토글이거나 마우스를 올렸을 때만 */}
                    {labelVisible(p.id) && (
                      <g transform={`translate(0,${TILE * (small ? 2.5 : 3.3)})`}
                         shapeRendering="crispEdges">
                        <rect width={TILE * (small ? 4.6 : 5.2)} height={on ? TILE * 1.5 : TILE * 1.0}
                              rx={2} fill="#F6EFDC" opacity={on ? 1 : 0.94}
                              stroke={on ? "#2E2822" : "transparent"} strokeWidth={1.4} />
                        <rect width={3} height={on ? TILE * 1.5 : TILE * 1.0}
                              fill={GRADE_COLOR[p.grade] ?? "#7A7A70"} />
                        <text x={6} y={10.5} fontSize={9.5} fontWeight={800} fill="#2E2822">
                          {p.short.length > 8 ? p.short.slice(0, 8) + "…" : p.short}
                        </text>
                        <text x={6} y={21} fontSize={7.5} fill="#7A6E58">
                          {p.name} · {p.grade}{p.xp ? ` · ${p.xp}회` : ""}
                        </text>
                        {on && (
                          <text x={6} y={31} fontSize={7.5} fill="#8A7A5C">
                            {p.byCodex ? "코덱스" : "launchd"} · {p.note.slice(0, 22)}
                          </text>
                        )}
                      </g>
                    )}
                  </g>
                );
              })}

            {/* 짐꾼 — 지금 실제로 넘어가는 자료만 사람이 들고 간다 */}
            {/* 진짜 배달 — 방금 소식을 남긴 사람의 길을 한 번만 건넌다.
                평소 짐꾼(아래)은 무한 반복이라 "요즘 오간다"는 뜻이고,
                이건 "방금 오갔다"는 뜻이다. 길도 같이 밝아진다. */}
            {routes.filter((r) => isPulsing(r.from)).slice(0, 3).map((r) => (
              <g key={`live-${r.key}`}>
                <path d={r.d} fill="none" stroke="#F2C14E" strokeWidth={3.5}
                      strokeLinecap="round" strokeLinejoin="round" opacity={0.7}
                      className="wk-pulse-path" />
                <g className="wk-dash"
                   style={{ offsetPath: `path("${r.d}")`, offsetRotate: "0deg" }}>
                  <g transform="translate(-9,-34) scale(1.3)">
                    <Runner id={`live-${r.key}`} craft="courier" />
                    <title>{`방금 전달 — ${byId.get(r.from)?.short} → ${byId.get(r.to)?.short}`}</title>
                  </g>
                </g>
              </g>
            ))}

            {carriers.map((c) => (
              <g key={c.key} className="wk-carry"
                 style={{ offsetPath: `path("${c.d}")`, offsetRotate: "0deg",
                          ["--dur" as string]: `${c.dur}s`,
                          animationDelay: `-${c.delay}s`,
                          opacity: ties && !ties.has(c.from) && !ties.has(c.to) ? 0.25 : 1 }}>
                <g transform="translate(-9,-34) scale(1.15)">
                  <Runner id={c.key} craft="courier" />
                  <title>{`${c.file} — ${byId.get(c.from)?.short} → ${byId.get(c.to)?.short}`}</title>
                </g>
              </g>
            ))}

            <g transform={`translate(0,${H})`}><Foreground w={W} /></g>
          </svg>
        </div>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]"
             style={{ color: "var(--text-muted-new)" }}>
          <span>발밑에 금빛 물결 = 방금 그 자동화가 일했다</span>
          <span>❗ 쓰러짐 · 💤 일 없음</span>
          <span>초록 점 = 지도에 연결이 안 적힌 잡</span>
          <span>이름은 평소 숨김 — 올리거나 켜서 본다</span>
        </div>
      </div>

      {/* 콘솔 패널 */}
      <aside className="xl:w-[300px] shrink-0 flex flex-col gap-3">
        {troubled.length > 0 && (
          <div className="wk-console p-3" style={{ background: "#F6DCCE" }}>
            <div className="wk-cap mb-1" style={{ color: "#8A2E1A", fontWeight: 700 }}>
              경보 · {troubled.length}
            </div>
            <ul className="flex flex-col gap-1">
              {troubled.map((p) => (
                <li key={p.id}>
                  <button onClick={() => focus(p.id)} className="text-left text-[11.5px] leading-snug">
                    <span className="font-bold">{TROUBLE_MARK[p.trouble].mark} {p.short}</span>
                    <span style={{ color: "#8A2E1A" }}> — {TROUBLE_MARK[p.trouble].say}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {rookies.length > 0 && (
          <div className="wk-console p-3" style={{ background: "#E4EFE7" }}>
            <div className="wk-cap mb-1" style={{ color: "#2C5A42", fontWeight: 700 }}>
              신입 · {rookies.length}
            </div>
            <p className="text-[11.5px] leading-snug mb-1.5" style={{ color: "#3A4A40" }}>
              실재하는데 지도에 안 적힌 자동화. 자동으로 마을에 세웠지만
              무엇을 먹고 무엇을 내는지 모르니 아직 아무와도 안 이어져 있다.
            </p>
            <ul className="flex flex-wrap gap-x-2 gap-y-0.5">
              {rookies.map((r) => (
                <li key={r.id}>
                  <button onClick={() => focus(r.id)}
                          className="text-left text-[11px] leading-snug underline decoration-dotted">
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="wk-console p-3" style={{ background: "#E8EEF4" }}>
          <div className="wk-cap mb-1.5" style={{ color: "#24303C", fontWeight: 700 }}>
            마을 명부 · {people.length}
          </div>
          {[...DISTRICTS.map((d) => ({ key: d.key as string, title: d.name,
                                       group: people.filter((p) => p.tier !== 3 && p.district === d.key) })),
            { key: "rest", title: "창고 · 꺼둔 것",
              group: people.filter((p) => p.tier === 3) }].map(({ key, title, group }) => {
            if (!group.length) return null;
            return (
              <div key={key} className="mb-2">
                <div className="wk-cap" style={{ color: "#5A6B7A" }}>{title} {group.length}</div>
                <ul className="flex flex-wrap gap-1 mt-1">
                  {group.map((p) => (
                    <li key={p.id}>
                      <button onClick={() => focus(p.id)}
                              title={`${p.grade} · ${p.xp}회${p.byCodex ? " · 코덱스" : ""}`}
                              className="flex items-center gap-1 px-1.5 py-[3px] text-[12px] leading-none"
                              style={{ opacity: ties && !ties.has(p.id) ? 0.3 : 1,
                                       borderRadius: 3,
                                       border: "1px solid #B9C7D4",
                                       background: picked === p.id ? "#C9D8E6" : "#F4F7FA" }}>
                        <span aria-hidden className="inline-block shrink-0"
                              style={{ width: 6, height: 6,
                                       background: DOT[p.status] ?? "#7A8B6A" }} />
                        <span className="font-semibold whitespace-nowrap">{p.short}</span>

                        {p.trouble !== "none" && p.trouble !== "rookie" && (
                          <span aria-hidden>{TROUBLE_MARK[p.trouble].mark}</span>
                        )}
                        {p.byCodex && (
                          <span style={{ color: "#8A96A2", fontSize: 10 }}>G</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <p className="text-[10.5px] mt-1" style={{ color: "#6B7A88" }}>
            눌러서 마을에서 찾는다 · <b>G</b> = 코덱스 · 점 색 = 돌음/조용/멈춤
          </p>
        </div>

        {picked && byId.get(picked) && (
          <div className="wk-console p-3" style={{ background: "#E8EEF4" }}>
            <div className="flex items-baseline gap-2">
              <div className="wk-cap" style={{ color: "#24303C", fontWeight: 700 }}>
                기록부
              </div>
              <button onClick={() => setPicked(null)} className="ml-auto text-[11px]"
                      style={{ color: "#5A6B7A" }}>닫기</button>
            </div>
            <p className="text-[12.5px] font-bold mt-1">{byId.get(picked)!.short}</p>
            <p className="text-[11px]" style={{ color: "#4E6272" }}>{byId.get(picked)!.label}</p>
            <p className="text-[11px] mt-1">
              <b>{byId.get(picked)!.name}</b> · {byId.get(picked)!.grade} ·
              누적 {byId.get(picked)!.xp}회
            </p>
            {/* 무슨 일을 하는지 — 한나 2026-08-30 "나는 이들이 하는 일을 잘 몰라".
                이게 기록부에서 제일 먼저 읽혀야 하는 줄이다. 10.5px로는 안 읽힌다. */}
            {byId.get(picked)!.note && (
              <p className="text-[12.5px] leading-snug mt-1.5 pl-2"
                 style={{ color: "#2E3E4A", borderLeft: "3px solid #7FA8C4" }}>
                {byId.get(picked)!.note}
              </p>
            )}
            <ul className="mt-1.5 flex flex-col gap-1">
              {pickedTies.map((t, i) => (
                <li key={i} className="text-[11px]">
                  <span className="font-bold"
                        style={{ color: t.dir === "받는다" ? "#8A6A2E" : "#3F5F45" }}>
                    {t.dir === "받는다" ? "←" : "→"} {byId.get(t.other)?.short ?? t.other}
                  </span>
                  <span style={{ color: "#6B7A88" }}> · {t.files.map(fileTag).join(", ")}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="wk-console p-3" style={{ background: "#E8EEF4" }}>
          <div className="wk-cap mb-1" style={{ color: "#24303C", fontWeight: 700 }}>
            작업 일지
          </div>
          <ol className="flex flex-col max-h-[190px] overflow-y-auto">
            {feed.slice(0, 18).map((e, i) => (
              <li key={i} className="py-1 text-[11px] leading-snug"
                  style={{ borderBottom: "1px solid #C9D8E6" }}>
                <span className="font-mono" style={{ color: "#6B7A88" }}>
                  {e.at.slice(5, 16).replace("T", " ")}
                </span>{" "}
                <span className="font-semibold" style={{ color: "#3F5F45" }}>{e.source}</span>
                <span className="block">{e.summary || e.type}</span>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}

const DOT: Record<string, string> = {
  돌음: "#3F6B45", 조용: "#8A6A2E", 멈춤: "#A85A35", 도달: "#4E6272",
};
