export type Account = "main" | "hyerin" | "food";
export type Source = "value" | "concern" | "trend" | "season";
export type Format = "skit" | "thought" | "vlog" | "review" | "experiment";

export interface PlanningIdea {
  id: string;
  score: number;
  account: Account;
  accountLabel: string;
  sources: Source[];
  sourceLabel: string;
  formats: Format[];
  formatLabel: string;
  role: string;
  title: string;
  verdict: string;
  situation: string;
  conflict: string;
  valueLine: string;
  judgment: string;
  series: string;
  primary: [string, string];
  post: [string, string];
  story: [string, string];
  why: [string, string];
  ab: Array<[string, string]>;
  references: Array<[string, string]>;
  risk: string;
  variant?: "A형" | "B형";
}

type PlanningIdeaSeed = Omit<PlanningIdea, "situation" | "conflict" | "valueLine" | "judgment"> & Partial<Pick<PlanningIdea, "situation" | "conflict" | "valueLine" | "judgment">>;

function normalizePlanningIdea(item: PlanningIdeaSeed | Record<string, any>): PlanningIdea {
  const verdict = String(item.verdict || "한나 확인이 필요한 후보");
  return {
    ...item,
    situation: String(item.situation || item.primary?.[1] || "첫 장면 확인 필요"),
    conflict: String(item.conflict || "이 장면에서 맞부딪히는 두 기준을 확인해야 한다."),
    valueLine: String(item.valueLine || verdict),
    judgment: String(item.judgment || verdict),
  } as PlanningIdea;
}

const dailyFallbackIds = ["phone-check", "photo-consent", "hyerin-retro-playlist", "hyerin-lp-no-skip", "pizza-crust-truce", "first-bite-retrial"];

export function planningIdeasForDay(raw: Array<Record<string, any>> | undefined): PlanningIdea[] {
  const input: Array<Record<string, any>> = raw?.length ? raw : dailyFallbackIds.map((id, index) => ({ id, variant: index % 2 ? "B형" : "A형" }));
  return input.flatMap((item) => {
    const seed = seedIdeas.find((idea) => idea.id === item.id);
    if (seed) return [normalizePlanningIdea({ ...seed, ...item })];
    if (!item.title || !item.account || !item.score) return [];
    return [normalizePlanningIdea(item)];
  }).sort((a, b) => b.score - a.score);
}

export const seedIdeas: PlanningIdeaSeed[] = [
  {
    id: "phone-check", score: 91, account: "main", accountLabel: "본계정", sources: ["value", "concern"], sourceLabel: "가치관", formats: ["skit"], formatLabel: "상황극", role: "유입",
    title: "“폰 줘봐. 볼 거 없으면 보여줄 수 있잖아.”", verdict: "부모의 책임과 부모의 불안은 다르다.", series: "우리 집, 어디까지?",
    primary: ["릴스", "첫 3초에 엄마와 아이의 충돌이 바로 보인다."], post: ["게시물", "연령별 확인 기준과 위험 신호"], story: ["스토리", "아이 폰, 부모가 봐도 된다? 투표"],
    why: ["장면", "휴대폰이라는 시각적 증거가 있다."], ab: [["A", "폰을 요구하는 실제 상황극"], ["B", "서로의 폰을 바꾸는 생활실험"]],
    references: [["한나 내부", "이중구속 85.9만 · 화장 허용 기준"], ["옵시디언 도서관", "사춘기 마음을 통역해 드립니다"], ["해외 원자료", "부모·십대 휴대폰 사용 조사"]],
    risk: "부모는 절대 보면 안 된다는 단순 결론으로 만들지 않는다.",
  },
  {
    id: "pizza-crust-truce", score: 89, account: "food", accountLabel: "먹거리", sources: ["concern", "value"], sourceLabel: "실제 사건", formats: ["skit", "vlog"], formatLabel: "생활사건", role: "유입+호감",
    title: "피자 끝만 남긴 딸. 끝만 좋아하지만 남이 남긴 건 싫은 엄마.", verdict: "피자 한 조각에서 둘의 취향과 위생 기준이 동시에 충돌한다.", series: "같은 음식, 다른 기준",
    primary: ["사건 릴스", "남은 피자 끝과 두 사람의 실랑이가 설명 없이도 보인다."], post: ["게시물", "가족끼리도 서로 다른 음식 경계를 존중하는 법"], story: ["스토리", "가족이 남긴 음식, 먹을 수 있어?"],
    why: ["고유 장면", "레시피도 제품 순위도 아닌 실제 모녀의 음식 행동이 캐릭터를 만든다."], ab: [["A", "피자 끝 하나를 가운데 놓고 둘 다 거절"], ["B", "혜린이 남기는 순간 한나가 좋아한다고 반기다가 멈춤"]],
    references: [["주제 제안 로그", "피자 끝을 남기는 혜린과 끝을 좋아하지만 남긴 것은 싫다는 한나의 실제 말싸움"], ["3계정 운영 정본", "먹거리는 취향·판단·실수·생생한 반응이 중심"], ["화면 증거", "남은 피자 끝과 두 사람의 표정"]],
    risk: "교훈을 길게 붙이지 말고 실제 대화와 선택으로 끝낸다.",
  },
  {
    id: "photo-consent", score: 88, account: "main", accountLabel: "본계정", sources: ["value"], sourceLabel: "가치관", formats: ["thought"], formatLabel: "생각 설명", role: "신뢰",
    title: "“엄마, 내 사진 또 올렸어?”", verdict: "가족사진이어도 공개될 사진은 다시 묻는다.", series: "크리에이터 엄마의 자기고백",
    primary: ["생각 릴스", "한나가 직접 당사자인 주제라 자기고백이 중심이다."], post: ["게시물", "가족사진 공개 기준과 예외"], story: ["스토리", "아이에게 매번 묻는지 조사"],
    why: ["한나다움", "다른 교육 계정이 대신하기 어려운 실제 계정 운영 문제다."], ab: [["A", "혜린의 한마디로 시작"], ["B", "한나의 과거 게시물을 보며 시작"]],
    references: [["한나 내부", "계정 운영과 가족 공개 경계"], ["해외 사례", "자녀 사진 공개 동의 논쟁"], ["확인 필요", "실제 한나·혜린 경험"]],
    risk: "혜린의 동의와 실제 공개 범위를 대본보다 먼저 확인한다.",
  },
  {
    id: "ai-homework", score: 86, account: "main", accountLabel: "본계정", sources: ["trend", "value"], sourceLabel: "유행·시의성", formats: ["skit", "thought"], formatLabel: "상황극+설명", role: "유입+신뢰",
    title: "AI로 쓴 수행평가, 어디부터 ‘내 것’이 아닐까?", verdict: "AI를 썼는지가 아니라 판단을 넘겼는지를 본다.", series: "AI 시대 우리 집 기준",
    primary: ["혼합 릴스", "현재성이 강하지만 한나의 기준까지 있어야 남는다."], post: ["게시물", "우리 집 AI 허용선 4개"], story: ["스토리", "학교에서 실제로 어디까지 쓰는지"],
    why: ["지금성", "십대와 엄마가 동시에 답을 궁금해하는 현재 갈등이다."], ab: [["A", "엄마가 아이의 AI 사용을 적발"], ["B", "혜린이 엄마의 AI 글을 적발"]],
    references: [["옵시디언 도서관", "생각의 주도권을 디자인하라"], ["해외 원자료", "청소년 AI 숙제 사용 조사"], ["한나 기준", "도구를 쓰되 판단은 맡기지 않는다"]],
    risk: "AI 찬반 강의로 흐르지 않고 실제 과제 한 장면으로 시작한다.",
  },
  {
    id: "hyerin-retro-playlist", score: 86, account: "hyerin", accountLabel: "혜린", sources: ["value", "trend"], sourceLabel: "취향 증거", formats: ["vlog", "review"], formatLabel: "취향 몽타주", role: "유입+호감",
    title: "엄마가 듣던 2000년대 노래가 내 플레이리스트를 점령했어.", verdict: "13살의 나이와 어긋나는 취향을 실제 재생목록과 몸 반응으로 증명한다.", series: "13살인데 왜 이걸 좋아해?",
    primary: ["취향 릴스", "혜린의 얼굴·이어폰·재생목록·따라 부르는 장면이 정체성을 만든다."], post: ["게시물", "혜린이 고른 엄마 세대 노래와 한 줄 판정"], story: ["스토리", "엄마 노래 중 지금도 듣는 곡 제보"],
    why: ["캐릭터", "책 잘 읽는 아이가 아니라 세대가 섞인 취향을 가진 혜린으로 기억된다."], ab: [["A", "13살 휴대폰에서 2000년대 재생목록을 먼저 공개"], ["B", "엄마가 세 곡을 틀고 혜린이 살릴 한 곡을 고름"]],
    references: [["혜린 성과", "13살 초딩 요즘 빠진 것들 11만대 · 취향 몽타주와 세대 반전"], ["혜린 비주얼 분석", "꽃보다 남자·2000년대 음악·미니언즈가 취향 증거로 작동"], ["계정 정본", "혜린의 엉뚱함·취향·실제 선택을 주인공으로 둔다"]],
    risk: "유행하는 음원을 억지로 넣지 말고 혜린의 실제 재생목록을 먼저 확인한다.",
  },
  {
    id: "first-bite-retrial", score: 85, account: "food", accountLabel: "먹거리", sources: ["value", "concern"], sourceLabel: "실제 반응", formats: ["experiment", "review"], formatLabel: "재시식 실험", role: "호감+신뢰",
    title: "“맛있어.” 3초 뒤 “아닌가?” 그래서 첫입 평가는 버리기로 했어.", verdict: "첫 반응 대신 세 번의 판정 변화를 보여줘 추천의 신뢰를 만든다.", series: "혜린 입맛 재판",
    primary: ["실험 릴스", "같은 음식에 대한 즉흥 반응과 최종 재구매 판정이 모두 사건이 된다."], post: ["게시물", "첫입·한 접시 뒤·다음날 판정표"], story: ["스토리", "첫입과 끝맛이 달랐던 음식 제보"],
    why: ["검증 방식", "제품 설명이 아니라 혜린의 오락가락하는 실제 반응을 검증 장치로 바꾼다."], ab: [["A", "맛있어→안 맛있어→괜찮아 세 표정을 2초에 압축"], ["B", "첫입 판정 카드를 찢고 두 번째 시식부터 시작"]],
    references: [["신신나 성과", "쿠팡 복숭아 29.8만 · 혜린의 판정이 맛있다→안 맛있다→괜찮다로 변화"], ["3계정 운영 정본", "객관 증거와 모녀의 다른 선택이 함께 있어야 함"], ["운영 원칙", "맛·원재료·돈값 중 실제 구매 실패를 줄이는 판정"]],
    risk: "반응을 연기시키지 말고 제품명보다 시식 시점과 최종 재구매 여부를 명확히 남긴다.",
  },
  {
    id: "tteokgalbi", score: 83, account: "food", accountLabel: "먹거리", sources: ["trend", "season"], sourceLabel: "제품·계절", formats: ["review"], formatLabel: "비교·리뷰", role: "신뢰",
    title: "냉장 떡갈비가 냉동보다 정말 나을까?", verdict: "맛·원재료·한 장 가격으로 다섯 제품을 줄인다.", series: "장보기 판정",
    primary: ["비교 릴스", "릴스에서는 최종 2개만 진하게 비교한다."], post: ["게시물 병행", "5제품 원재료·가격 전체표"], story: ["스토리", "먹어본 제품과 실패 경험 수집"],
    why: ["구매 문제", "맛없는 것·건강한 줄 알고 산 것·돈 낭비를 줄인다."], ab: [["A", "냉장 대 냉동"], ["B", "원재료 1등 대 맛 1등"]],
    references: [["시장 검색", "쿠팡·컬리 판매 제품"], ["먹거리 기준", "맛·원재료·돈값"], ["촬영 증거", "한 장 중량·가격·단면"]],
    risk: "한 영상에서 다섯 제품 정보를 전부 낭독하지 않는다.",
  },
  {
    id: "joke-boundary", score: 82, account: "main", accountLabel: "본계정", sources: ["concern", "value"], sourceLabel: "실제 고민", formats: ["skit"], formatLabel: "상황극", role: "유입",
    title: "“장난인데 왜 그렇게 예민해?”", verdict: "나쁜 의도가 없었다고 상처가 없어지지는 않는다.", series: "그 말, 아이한텐 이렇게 들려",
    primary: ["상황극 릴스", "친구의 말과 아이 반응이 바로 장면이 된다."], post: ["게시물", "상대를 끊기 전 쓸 경계 문장"], story: ["스토리", "장난과 무례의 기준 투표"],
    why: ["확산", "십대 공유 가능성이 높고 엄마에게는 개입 방법을 준다."], ab: [["A", "친구끼리 실제 상황극"], ["B", "엄마가 그런 애랑 놀지 마까지 연결"]],
    references: [["고민답장", "친구 화법·꼽주기"], ["옵시디언 도서관", "아이의 친구 관계"], ["성과 참고", "친구관계는 십대 유입이 강함"]],
    risk: "십대 조회에만 머물지 않도록 엄마가 해줄 한 문장을 넣는다.",
  },
  {
    id: "hyerin-lp-no-skip", score: 82, account: "hyerin", accountLabel: "혜린", sources: ["value"], sourceLabel: "실제 경험", formats: ["experiment", "vlog"], formatLabel: "경험 실험", role: "호감",
    title: "스킵이 안 되는 LP, 13살은 한 면을 끝까지 버틸까?", verdict: "편리함을 설명하지 않고 기다려야만 하는 음악 경험에 혜린을 넣어본다.", series: "처음 해보는 불편함",
    primary: ["경험 브이로그", "LP를 고르고 올리고 기다리고 뒤집는 행동 자체가 화면 서사다."], post: ["게시물", "스킵하지 못해서 발견한 한 곡과 혜린의 한 문장"], story: ["스토리", "노래를 끝까지 듣는 편인지 투표"],
    why: ["실제성", "강릉 LP 카페라는 이미 겪은 장소와 디지털 세대 혜린의 반응이 만난다."], ab: [["A", "다음 곡 버튼을 찾는 손부터 시작"], ["B", "한 면 20분 타이머와 끝까지 남은 표정"]],
    references: [["2026-08-12 하루기록", "혜린과 안목해변 LP 카페 방문 · 비 오는 날 LP 경험"], ["한나 관점", "편해진 세상에서 일부러 불편함을 설계한다"], ["혜린 정본", "일상·여행의 실제 사건과 반응을 우선한다"]],
    risk: "끝까지 들었다거나 감동했다는 결론은 먼저 쓰지 말고 당시 혜린의 실제 반응을 확인한다.",
  },
];

export function mergeCurrentCandidate(raw: Record<string, any> | null): PlanningIdea[] {
  if (!raw?.id) return seedIdeas.map(normalizePlanningIdea);
  const total = (raw.scores || []).reduce((sum: number, item: any) => sum + Number(item.score || 0), 0);
  const maximum = (raw.scores || []).reduce((sum: number, item: any) => sum + Number(item.max || 0), 0);
  const references: Array<[string, string]> = [
    ...(raw.internal_evidence || []).slice(0, 2).map((item: any) => [String(item.label), String(item.fact)] as [string, string]),
    ...(raw.external_evidence || []).slice(0, 1).map((item: any) => [String(item.label), String(item.fact)] as [string, string]),
  ];
  const current: PlanningIdea = {
    ...normalizePlanningIdea(seedIdeas.find((idea) => idea.id === "first-bite-retrial")!),
    id: String(raw.id),
    score: maximum ? Math.round((total / maximum) * 100) : 84,
    title: String(raw.title || "현재 후보"),
    verdict: String(raw.core_line || "한나 확인이 필요한 현재 후보"),
    situation: String(raw.situation || (raw.scene_plan || [])[0] || "첫 장면 확인 필요"),
    conflict: String(raw.conflict || "이 장면에서 맞부딪히는 두 기준을 확인해야 한다."),
    valueLine: String(raw.valueLine || raw.core_line || "이 계정이 지킬 가치를 한나와 확인한다."),
    judgment: String(raw.judgment || raw.core_line || "마지막 판정은 한나 확인 뒤 확정한다."),
    primary: ["릴스", String(raw.account_reason || "실제 선택과 반응을 장면으로 보여준다.")],
    why: ["실제 근거", String(raw.why_hanna || raw.why_now || "한나의 실제 생활에서 출발했다.")],
    ab: [
      ["A", String((raw.scene_plan || [])[0] || "갈등 대사부터 시작")],
      ["B", String((raw.scene_plan || [])[5] || "결과 장면을 먼저 예고")],
    ],
    references: references.length ? references : [["현재 후보", String(raw.why_now || "근거 확인 필요")]],
    risk: String((raw.guardrails || [])[0] || "실제 경험을 확인한 뒤 대본으로 발전한다."),
  };
  return [current, ...seedIdeas.filter((idea) => idea.id !== "first-bite-retrial" && idea.id !== current.id).map(normalizePlanningIdea)]
    .sort((a, b) => b.score - a.score);
}
