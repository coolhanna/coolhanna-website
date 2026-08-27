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

const dailyFallbackIds = ["phone-check", "photo-consent", "hyerin-writer", "hyerin-book", "solo-meal", "mango"];

export function planningIdeasForDay(raw: Array<Record<string, any>> | undefined): PlanningIdea[] {
  const input: Array<Record<string, any>> = raw?.length ? raw : dailyFallbackIds.map((id, index) => ({ id, variant: index % 2 ? "B형" : "A형" }));
  return input.flatMap((item) => {
    const seed = seedIdeas.find((idea) => idea.id === item.id);
    if (seed) return [{ ...seed, ...item } as PlanningIdea];
    if (!item.title || !item.account || !item.score) return [];
    return [item as PlanningIdea];
  }).sort((a, b) => b.score - a.score);
}

export const seedIdeas: PlanningIdea[] = [
  {
    id: "phone-check", score: 91, account: "main", accountLabel: "본계정", sources: ["value", "concern"], sourceLabel: "가치관", formats: ["skit"], formatLabel: "상황극", role: "유입",
    title: "“폰 줘봐. 볼 거 없으면 보여줄 수 있잖아.”", verdict: "부모의 책임과 부모의 불안은 다르다.", series: "우리 집, 어디까지?",
    primary: ["릴스", "첫 3초에 엄마와 아이의 충돌이 바로 보인다."], post: ["게시물", "연령별 확인 기준과 위험 신호"], story: ["스토리", "아이 폰, 부모가 봐도 된다? 투표"],
    why: ["장면", "휴대폰이라는 시각적 증거가 있다."], ab: [["A", "폰을 요구하는 실제 상황극"], ["B", "서로의 폰을 바꾸는 생활실험"]],
    references: [["한나 내부", "이중구속 85.9만 · 화장 허용 기준"], ["옵시디언 도서관", "사춘기 마음을 통역해 드립니다"], ["해외 원자료", "부모·십대 휴대폰 사용 조사"]],
    risk: "부모는 절대 보면 안 된다는 단순 결론으로 만들지 않는다.",
  },
  {
    id: "mango", score: 89, account: "food", accountLabel: "먹거리", sources: ["season"], sourceLabel: "제품·계절", formats: ["review"], formatLabel: "비교·리뷰", role: "유입+신뢰",
    title: "망고 네 개가 10만 원. 진짜 돈값을 할까?", verdict: "노랑망고와 제주 애플망고를 같은 기준으로 판정한다.", series: "맛·원재료·돈값",
    primary: ["비교 릴스", "단면·가격·동시 시식이 모두 화면 증거가 된다."], post: ["게시물", "품종·가격·보관법 정리"], story: ["스토리", "어느 망고를 살지 투표"],
    why: ["화면", "자르기·단면·시식·재구매 판정까지 흐름이 분명하다."], ab: [["A", "10만 원 가격 훅"], ["B", "완전히 다른 단면 훅"]],
    references: [["실제 제품", "필리핀 프리미엄 망고·제주 애플망고"], ["내부 기획", "기존 망고 비교 영상 흐름"], ["외부 자료", "품종 정보와 맛 표현 자료"]],
    risk: "긴 산지 설명과 눈가리기 포맷으로 되돌아가지 않는다.",
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
    id: "hyerin-writer", score: 85, account: "hyerin", accountLabel: "혜린", sources: ["value"], sourceLabel: "가치관", formats: ["vlog", "thought"], formatLabel: "브이로그+생각", role: "호감",
    title: "작가라고 매일 쓰고 싶은 건 아니야.", verdict: "쓰기 싫은 날에도 작가인 사람의 실제 하루.", series: "혜린의 생활",
    primary: ["브이로그", "혜린은 설명보다 실제 생활 장면이 먼저 캐릭터를 만든다."], post: ["게시물", "혜린이 직접 쓴 짧은 글"], story: ["스토리", "오늘 쓴 한 문장"],
    why: ["형식", "책상·학교 후·빈 문서·한 줄 쓰는 장면이 있다."], ab: [["A", "말없는 브이로그+짧은 자막"], ["B", "혜린 1인칭 내레이션"]],
    references: [["혜린 내부", "실제 글과 자주 쓰는 표현"], ["계정 기준", "혜린이 직접 고친 문장"], ["화면", "쓰기 전 미루는 실제 행동"]],
    risk: "한나가 작가로 키운 비결을 설명하지 않는다.",
  },
  {
    id: "solo-meal", score: 84, account: "food", accountLabel: "먹거리", sources: ["concern", "value"], sourceLabel: "실제 고민", formats: ["experiment", "vlog"], formatLabel: "생활실험", role: "호감+신뢰",
    title: "“알아서 먹어.” 그런데 그걸 먹으면 안 돼?", verdict: "자립은 엄마가 원하는 답을 혼자 해내는 게 아니다.", series: "십대의 먹고사는 연습",
    primary: ["생활실험", "혜린의 실제 선택과 한나의 개입이 사건이 된다."], post: ["게시물", "혼자 먹는 날의 최소 한 끼 기준"], story: ["스토리", "십대가 혼자 먹는 실제 메뉴"],
    why: ["현실", "간편식 하나를 끼워 넣는 실제 가족 식사 문제다."], ab: [["A", "알아서 먹어 이중구속"], ["B", "냉장고 안에서 혜린이 고르는 장면"]],
    references: [["한나 내부", "10대 가족의 실제 식사 갈등"], ["신신나 성과", "배달 대신 집마라탕"], ["도서관", "청소년 영양과 자립 자료"]],
    risk: "모녀 관찰 예능만 남거나 영양 강의로 끝내지 않는다.",
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
    id: "hyerin-book", score: 79, account: "hyerin", accountLabel: "혜린", sources: ["trend", "value"], sourceLabel: "유행·시의성", formats: ["thought", "review"], formatLabel: "짧은 리뷰", role: "유입+호감",
    title: "다들 인생책이라는데, 나는 50쪽에서 덮었어.", verdict: "유명한 책과 내 취향은 별개라는 혜린의 판정.", series: "십대 취향 판정",
    primary: ["생각 설명", "혜린의 취향과 판정이 영상의 결론이다."], post: ["게시물", "덮은 이유와 좋았던 한 문장"], story: ["스토리", "완독 강박이 있는지 투표"],
    why: ["지금성", "현재 화제 도서를 혜린의 실제 선택으로 다시 본다."], ab: [["A", "책을 덮는 장면부터"], ["B", "나만 재미없어 질문부터"]],
    references: [["혜린 내부", "실제 독서 취향과 표현"], ["외부 신호", "현재 화제 도서는 제작 전 재확인"], ["형식 참고", "또래 1인칭 짧은 리뷰"]],
    risk: "어른식 작품 해설과 교훈을 혜린의 입에 넣지 않는다.",
  },
];

export function mergeCurrentCandidate(raw: Record<string, any> | null): PlanningIdea[] {
  if (!raw?.id) return seedIdeas;
  const total = (raw.scores || []).reduce((sum: number, item: any) => sum + Number(item.score || 0), 0);
  const maximum = (raw.scores || []).reduce((sum: number, item: any) => sum + Number(item.max || 0), 0);
  const references: Array<[string, string]> = [
    ...(raw.internal_evidence || []).slice(0, 2).map((item: any) => [String(item.label), String(item.fact)] as [string, string]),
    ...(raw.external_evidence || []).slice(0, 1).map((item: any) => [String(item.label), String(item.fact)] as [string, string]),
  ];
  const current: PlanningIdea = {
    ...seedIdeas.find((idea) => idea.id === "solo-meal")!,
    id: String(raw.id),
    score: maximum ? Math.round((total / maximum) * 100) : 84,
    title: String(raw.title || "현재 후보"),
    verdict: String(raw.core_line || "한나 확인이 필요한 현재 후보"),
    primary: ["릴스", String(raw.account_reason || "실제 선택과 반응을 장면으로 보여준다.")],
    why: ["실제 근거", String(raw.why_hanna || raw.why_now || "한나의 실제 생활에서 출발했다.")],
    ab: [
      ["A", String((raw.scene_plan || [])[0] || "갈등 대사부터 시작")],
      ["B", String((raw.scene_plan || [])[5] || "결과 장면을 먼저 예고")],
    ],
    references: references.length ? references : [["현재 후보", String(raw.why_now || "근거 확인 필요")]],
    risk: String((raw.guardrails || [])[0] || "실제 경험을 확인한 뒤 대본으로 발전한다."),
  };
  return [current, ...seedIdeas.filter((idea) => idea.id !== "solo-meal" && idea.id !== current.id)]
    .sort((a, b) => b.score - a.score);
}
