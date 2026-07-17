"use client";

// 콘텐츠 진행 — 아이디어부터 업로드까지 영상 제작 단계를 한눈에.
// 원래 별도 앱(coolhanna-pipeline.vercel.app)이었는데 2026-07-17 메인 대시보드로 합침
// (주소창 사라짐 + 상단 네비가 DashboardNav로 자동 통일 — 탭 추가해도 안 어긋남).
// 데이터는 localStorage(coolhanna-pipeline:videos:v1) — 도메인 이전 시 마이그레이션 필요했음.

import { Dashboard } from "@/components/pipeline/Dashboard";
import { RefreshButton } from "@/components/pipeline/RefreshButton";
import styles from "@/components/pipeline/pipeline.module.css";

export default function PipelineBoard() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleWrap}>
          <h1 className={styles.title}>콘텐츠 진행</h1>
        </div>
        <RefreshButton />
      </header>

      <Dashboard />
    </main>
  );
}
