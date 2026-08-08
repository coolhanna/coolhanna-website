import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "숏폼 운영실",
  robots: { index: false, follow: false },
};

export default function ShortsOpsPage() {
  return (
    <main style={{ height: "calc(100vh - 52px)", background: "#f5f1e8" }}>
      <iframe
        src="/shorts-ops/shorts.html"
        title="숏폼 운영실"
        style={{ width: "100%", height: "100%", border: 0, display: "block" }}
      />
    </main>
  );
}
