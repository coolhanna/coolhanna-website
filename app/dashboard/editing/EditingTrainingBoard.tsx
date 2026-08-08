const PATTERNS = [
  {
    id: "scripted",
    name: "대본이 있는 영상",
    count: "0/3",
    progress: 0,
    goal: "대본 대조, 재시작·침묵 제거, 자막 초안, 프리미어 초벌 컷",
    next: "다음 녹화 1순위",
  },
  {
    id: "unscripted",
    name: "대본 없는 먹거리·모녀 대화",
    count: "1/5",
    progress: 20,
    goal: "재미있는 반응 선택, 말 순서 정리, 제품 화면 연결, B-roll 초벌 배치",
    next: "1번 분석 완료",
  },
] as const;

const RECORDING_GUIDE = [
  "화면 녹화와 마이크를 함께 켜기",
  "살리기·자르기·순서 변경처럼 판단이 생길 때만 이유 말하기",
  "원본·편집 녹화·최종 완성본을 같은 작업 묶음으로 남기기",
  "같은 녹화의 복사본은 학습 개수에서 제외하기",
];

const MILESTONES = [
  { count: "각 유형 2개", result: "실제 원본으로 초벌 편집 시험" },
  { count: "총 8개", result: "반복 규칙 고정·자동화 범위 결정" },
  { count: "10~12개", result: "예외적인 편집 판단 보강" },
];

export default function EditingTrainingBoard() {
  return (
    <main className="mx-auto max-w-5xl px-5 sm:px-8 pb-20">
      <header className="pt-8 pb-5">
        <p className="text-[11px] font-semibold tracking-[0.12em] mb-1" style={{ color: "var(--accent-dark)" }}>
          분석에서 다음 제작까지 연결하는 곳
        </p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">숏폼 운영실</h1>
            <p className="text-[13px] mt-2" style={{ color: "var(--text-secondary)" }}>
              오늘 만들 영상, 제작 진행, 성과 학습과 편집 자동화를 한곳에서 관리합니다.
            </p>
          </div>
          <div className="text-right">
            <strong className="text-4xl tabular-nums">1/8</strong>
            <p className="text-[11px] mt-1" style={{ color: "var(--text-secondary)" }}>분석 완료 / 1차 목표</p>
          </div>
        </div>
      </header>

      <div className="flex items-end justify-between gap-3 mt-4 mb-3">
        <div>
          <p className="text-[11px] font-semibold" style={{ color: "var(--accent-dark)" }}>제작 시스템</p>
          <h2 className="text-xl font-semibold mt-1">편집 자동화 학습</h2>
        </div>
        <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>현재 1차 데이터 수집 중</span>
      </div>

      <section className="rounded-2xl p-5 sm:p-6 mb-4" style={{ background: "var(--text-main)", color: "#fff" }}>
        <p className="text-[11px] font-semibold mb-2" style={{ color: "#E8D67C" }}>다음 녹화</p>
        <h2 className="text-xl sm:text-2xl font-semibold leading-snug">
          대본형 1개를 편집하면서 판단이 생기는 순간에만 짧게 이유를 말해주세요.
        </h2>
        <p className="text-[12px] mt-3 opacity-70">
          목표는 원본과 대본만 넘기면 프리미어 초벌본이 나오고, 한나는 재미와 최종 감각만 확인하는 제작라인입니다.
        </p>
      </section>

      <section className="grid md:grid-cols-2 gap-3 mb-4">
        {PATTERNS.map((pattern) => (
          <article key={pattern.id} className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold" style={{ color: "var(--accent-dark)" }}>{pattern.next}</span>
              <strong className="text-2xl tabular-nums">{pattern.count}</strong>
            </div>
            <h2 className="text-lg font-semibold mt-3">{pattern.name}</h2>
            <div className="h-2 rounded-full mt-4 overflow-hidden" style={{ background: "var(--bg-card-soft)" }}>
              <div className="h-full rounded-full" style={{ width: `${pattern.progress}%`, background: pattern.id === "scripted" ? "var(--accent)" : "var(--secondary)" }} />
            </div>
            <p className="text-[12px] leading-relaxed mt-4" style={{ color: "var(--text-secondary)" }}>{pattern.goal}</p>
          </article>
        ))}
      </section>

      <section className="grid md:grid-cols-2 gap-3">
        <article className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <h2 className="text-[15px] font-semibold mb-3">녹화할 때 네 가지만</h2>
          <ol className="space-y-3">
            {RECORDING_GUIDE.map((item, index) => (
              <li key={item} className="flex gap-3 text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold" style={{ background: "var(--accent-soft)", color: "var(--accent-text)" }}>{index + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </article>

        <article className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <h2 className="text-[15px] font-semibold mb-3">언제 무엇을 맡길 수 있나</h2>
          <div className="space-y-3">
            {MILESTONES.map((milestone) => (
              <div key={milestone.count} className="flex items-start gap-3 pb-3 last:pb-0" style={{ borderBottom: "1px solid var(--border)" }}>
                <strong className="shrink-0 text-[12px] min-w-20">{milestone.count}</strong>
                <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{milestone.result}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
