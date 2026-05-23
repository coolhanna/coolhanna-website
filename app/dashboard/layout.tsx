import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "한나 운영 대시보드",
  robots: { index: false, follow: false },
};

// 루트 레이아웃의 <Header> / <Footer>를 가림 — 대시보드는 별도 헤더 사용.
// dashboard-root 클래스 안에서만 새 컬러 시스템 적용 (포레스트 그린 + 버터).
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        body > header, body > footer { display: none !important; }
        body > main { padding: 0 !important; }

        .dashboard-root {
          /* F번 — 세이지 + 크림 */
          --bg-page: #F4F2EC;
          --bg-card: #FFFFFF;
          --bg-card-soft: #ECECE4;
          --border: #DCDED4;
          --border-strong: #C0C4B5;
          --text-main: #2C342C;
          --text-secondary: #5D6B5A;
          --text-muted-new: #8A9080;
          --accent: #7A8B6A;
          --accent-soft: #E3E8DA;
          --accent-text: #3F4F33;
          --accent-dark: #5D6E4F;
          --secondary: #B5A874;
          --secondary-soft: #F0E8C8;
          --secondary-text: #6B5A20;
          --danger: #A85A35;
          --danger-soft: #F0DCC8;
          --danger-text: #6B3A1A;
          --success: #5D6E4F;
          background: var(--bg-page);
          color: var(--text-main);
        }
        .dashboard-root .bg-paper { background-color: var(--bg-page) !important; }
        .dashboard-root .bg-white { background-color: var(--bg-card) !important; }
        .dashboard-root .text-ink { color: var(--text-main) !important; }
        .dashboard-root .text-muted { color: var(--text-secondary) !important; }
        .dashboard-root .border-rule { border-color: var(--border) !important; }
        .dashboard-root input[type="checkbox"] { accent-color: var(--accent); }
        .dashboard-root ::selection { background: var(--accent); color: #ffffff; }

        /* v6.3.1 — 모바일에서 본문 폰트 전반 +2px (헤더 텍스트는 그대로) */
        @media (max-width: 767px) {
          .dashboard-root .text-\\[10px\\] { font-size: 12px !important; }
          .dashboard-root .text-\\[11px\\] { font-size: 13px !important; }
          .dashboard-root .text-\\[12px\\] { font-size: 14px !important; }
          .dashboard-root .text-xs { font-size: 14px !important; line-height: 1.45 !important; }
          .dashboard-root .text-sm { font-size: 16px !important; line-height: 1.5 !important; }
          /* 상단 헤더 (날짜·시간) 는 원래 크기 유지 — 한나 명세 */
          .dashboard-root > header .text-xs { font-size: 0.75rem !important; line-height: 1rem !important; }
          /* v6.6.1 — 모바일 헤더 시계 축소 (text-lg → text-base) */
          .dashboard-root > header .text-lg { font-size: 1rem !important; }
        }
        /* v6.6.1 — 카드 시각 계층: 보더 약간 연하게, 호버 시 또렷 */
        .dashboard-root section[class*="rounded-2xl"]:hover {
          border-color: var(--border-strong) !important;
        }
      `}</style>
      {children}
    </>
  );
}
