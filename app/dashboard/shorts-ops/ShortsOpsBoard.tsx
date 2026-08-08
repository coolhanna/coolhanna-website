const actions = [
  { lane: "먹거리", title: "라면 3개를 첫 화면에 놓는 비교 훅 확정", why: "순위·비교형은 5.7만~7.5만 회, 추상적인 건강 약속은 3천 회대였습니다.", result: "맛·가격·다시 살 1개를 약속하는 첫 2초 촬영안" },
  { lane: "육아실험실", title: "지디샴푸 ‘오해’의 설명부를 한 장면으로 압축", why: "강한 훅 뒤 정면 설명 구간에서 이탈 신호가 잡혔습니다.", result: "첫 3초 사건·시연 1개·마지막 티키타카" },
  { lane: "학습", title: "검증된 추천 2편에서 장치 하나씩 채택", why: "레퍼런스를 저장하고도 실제 제작으로 연결하지 못했던 병목을 끊습니다.", result: "육아 1개·먹거리 1개 촬영안에 장치 반영" },
];

const judgements = [
  { lane: "먹거리", title: "속편한 라면 드실분?", due: "D+7 · 8월 13일", signal: "3,005회 — 아직 조기 신호", next: "첫 2초만 교체할지 판정" },
  { lane: "육아실험실", title: "밖에서 씻김당하기", due: "D+7 · 8월 12일", signal: "68,083회 · 계속 시청 79%", next: "행동 먼저 포맷 재시험 여부" },
  { lane: "먹거리", title: "김덕후 최애김 1~7위", due: "D+7 · 판정 시점", signal: "56,927회 · 평균 시청률 67.6%", next: "순위형을 다음 3편 안에 재사용" },
];

const channels = [
  { name: "육아실험실", count: "1/3", role: "공감 → 관점 → 신뢰", metric: "공유·구독 전환", move: "질문·역할반전 훅을 유지하고 후반 설명을 시연 1개로 압축" },
  { name: "먹거리", count: "4/4", role: "발견 → 비교 → 구매 판단", metric: "시청 유지·상품 질문", move: "세 제품 동시 노출 → 차이 시연 → 다시 살 1개로 닫기" },
];

const pipeline = [
  { lane: "육아", title: "지디샴푸 1편 — 오해", stage: "대본 확정", next: "촬영" },
  { lane: "먹거리", title: "라면 3종 — 맛·가격·재구매 판정", stage: "기획", next: "제품 3개 확정" },
  { lane: "육아", title: "지디샴푸 2편 — 변화", stage: "대기", next: "1편 촬영 후 대본" },
];

const learnings = [
  { title: "파스타 초딩도 만들어요", views: "7.5만", learned: "아이가 실제로 해내는 증거가 긴 길이를 버티게 했습니다." },
  { title: "쿠팡 복숭아 1~5위", views: "6.6만", learned: "순위와 마지막 선택이 시청 이유를 끝까지 유지했습니다." },
  { title: "김덕후 최애김 1~7위", views: "5.7만", learned: "개인 취향을 숨기지 않은 순위가 구매 판단이 됐습니다." },
  { title: "밖에서 씻김당하기", views: "6.8만", learned: "설명보다 행동이 먼저 보이는 첫 장면이 스와이프를 막았습니다." },
];

const watch = [
  { no: "01", title: "이연복 짜장라면 레시피", focus: "완성 음식과 차이를 첫 화면에 동시에 보여주는 방식", apply: "라면 3종 눈가림 선택" },
  { no: "02", title: "요리유튜버 칼 광고 콩트", focus: "제품 설명 전에 사건을 만드는 순서", apply: "혜린의 짜증을 엄마가 오해하는 사건" },
  { no: "03", title: "소규모 계정 돌파 후보", focus: "검증 가능한 후보가 생길 때까지 비워둠", apply: "억지로 채우지 않기" },
];

function Heading({ n, title, note }: { n: string; title: string; note: string }) {
  return <header className="flex flex-wrap items-end justify-between gap-2 border-b-2 pb-3 mb-3" style={{ borderColor: "var(--text-main)" }}><div className="flex items-baseline gap-3"><span className="text-[11px] font-bold" style={{ color: "var(--accent-dark)" }}>{n}</span><h2 className="text-xl font-semibold">{title}</h2></div><p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{note}</p></header>;
}

function Card({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return <article className="rounded-xl p-5" style={{ background: dark ? "var(--text-main)" : "var(--bg-card)", color: dark ? "white" : "inherit", border: dark ? "none" : "1px solid var(--border)" }}>{children}</article>;
}

export default function ShortsOpsBoard() {
  return (
    <main className="mx-auto max-w-6xl px-5 sm:px-8 pb-24">
      <header className="grid md:grid-cols-[1.4fr_.6fr] gap-3 pt-8 mb-10">
        <Card><p className="text-[11px] font-bold mb-2" style={{ color: "var(--accent-dark)" }}>이번 주 한 문장</p><h1 className="text-3xl sm:text-5xl font-semibold leading-tight tracking-tight">육아는 강한 훅을 짧은 본문으로 잇고,<br />먹거리는 설명을 선택 장면으로 바꿉니다.</h1><p className="text-[13px] mt-4" style={{ color: "var(--text-secondary)" }}>분석에서 멈추지 않고 오늘 제작할 행동까지 연결하는 숏폼 운영실입니다.</p></Card>
        <Card dark><p className="text-[11px] font-bold" style={{ color: "#E8D67C" }}>섞지 않을 것</p><p className="text-lg font-semibold leading-relaxed mt-4">육아와 먹거리를 한 영상 안에서 섞지 않습니다. 모녀의 생활감은 형식으로만 공유합니다.</p></Card>
      </header>

      <section className="mb-12"><Heading n="01" title="오늘 할 일" note="세 개만 끝내면 오늘 운영은 완료입니다." /><div className="grid md:grid-cols-3 gap-3">{actions.map((a) => <Card key={a.title}><span className="text-[11px] font-bold" style={{ color: "var(--accent-dark)" }}>{a.lane}</span><h3 className="text-lg font-semibold mt-4 mb-4">{a.title}</h3><p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}><b className="block text-ink">왜 지금?</b>{a.why}</p><p className="text-[12px] mt-4"><b className="block">남길 결과물</b>{a.result}</p></Card>)}</div></section>

      <section className="mb-12"><Heading n="02" title="판정 대기" note="아직 배움이 끝나지 않은 영상입니다." /><div className="grid md:grid-cols-3 gap-3">{judgements.map((j) => <Card key={j.title}><div className="flex justify-between text-[11px]"><b>{j.lane}</b><span style={{ color: "var(--text-secondary)" }}>{j.due}</span></div><h3 className="text-lg font-semibold mt-4">{j.title}</h3><p className="rounded-lg p-3 text-[12px] mt-4" style={{ background: "var(--bg-card-soft)" }}>{j.signal}</p><p className="text-[12px] mt-4"><b className="block">판정 후 행동</b>{j.next}</p></Card>)}</div></section>

      <section className="mb-12"><Heading n="03" title="두 채널 주간판" note="같은 모녀가 나오지만 성공 기준은 다릅니다." /><div className="grid md:grid-cols-2 gap-3">{channels.map((c) => <Card key={c.name}><div className="flex justify-between items-end"><div><span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{c.role}</span><h3 className="text-2xl font-semibold">{c.name}</h3></div><strong className="text-4xl">{c.count}</strong></div><div className="h-2 my-5" style={{ background: "var(--bg-card-soft)" }}><div className="h-full w-2/3" style={{ background: "var(--accent)" }} /></div><p className="text-[12px]"><b className="block">성공 기준</b>{c.metric}</p><p className="text-[12px] mt-3"><b className="block">다음 움직임</b>{c.move}</p></Card>)}</div></section>

      <section className="mb-12"><Heading n="04" title="제작 중" note="아이디어가 아니라 다음 동작이 보이게 합니다." /><div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>{pipeline.map((p) => <div key={p.title} className="grid grid-cols-[70px_1fr_auto] gap-4 p-4 items-center" style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}><span className="text-[11px]">{p.lane}</span><div><b className="text-[14px]">{p.title}</b><p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{p.stage}</p></div><strong className="text-[12px]">다음 · {p.next}</strong></div>)}</div></section>

      <section className="mb-12"><Heading n="05" title="내 영상에서 배운 것" note="조회수 자랑이 아니라 다음 편을 바꾸는 근거입니다." /><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">{learnings.map((l) => <Card key={l.title}><h3 className="font-semibold min-h-12">{l.title}</h3><strong className="text-3xl block py-4 my-3" style={{ borderBlock: "1px solid var(--border)" }}>{l.views}</strong><p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{l.learned}</p></Card>)}</div></section>

      <section className="rounded-2xl p-5 sm:p-7 mb-12" style={{ background: "var(--bg-card-soft)" }}><Heading n="06" title="오늘 볼 영상" note="다음 제작에 쓸 장치를 하나씩 가져옵니다." /><div className="grid md:grid-cols-3 gap-3">{watch.map((w) => <Card key={w.no}><strong className="text-5xl" style={{ color: "var(--secondary)" }}>{w.no}</strong><h3 className="text-lg font-semibold mt-3">{w.title}</h3><p className="text-[12px] mt-4"><b className="block">여기만 보기</b>{w.focus}</p><p className="text-[12px] mt-4" style={{ color: "var(--accent-dark)" }}><b className="block">한나식 적용</b>{w.apply}</p></Card>)}</div></section>

      <section className="mb-12"><Heading n="07" title="다음 실험" note="한 번에 한 변수만 바꿉니다." /><div className="grid md:grid-cols-2 gap-3"><Card><span className="text-[11px]">먹거리</span><h3 className="text-xl font-semibold mt-2">건강 설명 vs 눈가림 선택</h3><p className="text-[12px] mt-4">세 제품을 동시에 보여주고 마지막 1등을 약속했을 때 초반 이탈이 줄어드는지 확인합니다.</p></Card><Card><span className="text-[11px]">육아실험실</span><h3 className="text-xl font-semibold mt-2">정면 설명 전 사건 한 컷</h3><p className="text-[12px] mt-4">혜린의 행동이나 모녀 충돌을 첫 2초에 두었을 때 메시지 도달이 늘어나는지 확인합니다.</p></Card></div></section>

      <section className="mb-12"><Heading n="08" title="편집 자동화 학습" note="숏폼 제작 시간을 줄이는 별도 학습 트랙입니다." /><div className="grid lg:grid-cols-[.8fr_1.2fr] gap-3"><Card dark><div className="flex justify-between items-end"><div><span className="text-[11px]" style={{ color: "#E8D67C" }}>현재 학습</span><h3 className="text-2xl font-semibold mt-2">1차 데이터 수집 중</h3></div><strong className="text-5xl">1/8</strong></div><p className="text-[13px] mt-6 opacity-80">다음은 대본형 1개를 편집하며 판단 순간에만 짧게 이유를 말해주세요.</p></Card><div className="grid sm:grid-cols-2 gap-3"><Card><div className="flex justify-between"><b>대본이 있는 영상</b><strong>0/3</strong></div><p className="text-[12px] mt-5" style={{ color: "var(--text-secondary)" }}>대본 대조·재시작·침묵 제거·자막 초안·프리미어 초벌 컷</p></Card><Card><div className="flex justify-between"><b>대본 없는 먹거리·모녀 대화</b><strong>1/5</strong></div><p className="text-[12px] mt-5" style={{ color: "var(--text-secondary)" }}>재미있는 반응·말 순서·제품 화면·B-roll 초벌 배치</p></Card></div></div></section>
    </main>
  );
}
