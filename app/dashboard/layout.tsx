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
          --bg-page: #FAF7EC;
          --bg-card: #FFFFFF;
          --bg-card-soft: #F4F0E0;
          --border: #E0DBC8;
          --border-strong: #C8C0A8;
          --text-main: #1A3322;
          --text-secondary: #5A6B5A;
          --text-muted-new: #8A9080;
          --accent: #2A5A3D;
          --accent-soft: #D8E5DC;
          --accent-text: #1F4029;
          --secondary: #F4D67A;
          --secondary-soft: #F8EDC8;
          --secondary-text: #6B4A0A;
          --danger: #C24A20;
          --danger-soft: #F5DCC8;
          --danger-text: #7A2A10;
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
      `}</style>
      {children}
    </>
  );
}
