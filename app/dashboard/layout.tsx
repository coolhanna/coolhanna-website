import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "한나 운영 대시보드",
  robots: { index: false, follow: false },
};

// 루트 레이아웃의 <Header> / <Footer>를 가림 — 대시보드는 별도 헤더 사용.
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
      `}</style>
      {children}
    </>
  );
}
