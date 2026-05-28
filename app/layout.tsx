import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getAllNewsletters } from "@/lib/newsletters";

const totalIssues = getAllNewsletters().length;

export const metadata: Metadata = {
  metadataBase: new URL("https://coolhanna.com"),
  title: {
    default: "쿨한나 — 매주 월요일, 진심으로 씁니다",
    template: "%s — 쿨한나",
  },
  description: `사교육 없이 13세 영재 키운 엄마, 한나가 매주 월요일 보내는 뉴스레터. ${totalIssues}편 아카이브와 신규 구독.`,
  openGraph: {
    title: "쿨한나 뉴스레터",
    description: "매주 월요일, 진심으로 씁니다.",
    url: "https://coolhanna.com",
    siteName: "쿨한나",
    locale: "ko_KR",
    type: "website",
  },
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/coolhanna-icon.svg", type: "image/svg+xml" },
      { url: "/icons/coolhanna-icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "한나 운영",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#F4F2EC",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="font-sans">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
