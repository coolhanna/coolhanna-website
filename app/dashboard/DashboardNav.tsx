"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./navigation.module.css";

const AREAS = [
  { label: "오늘", links: [
    { label: "함께 쓰는 하루", href: "/dashboard/diary" },
    { label: "브리핑", href: "/dashboard/briefing" },
    { label: "한나 데스크", href: "/dashboard/desk" },
  ] },
  { label: "콘텐츠", links: [
    { label: "기획 · 보관함", href: "/dashboard/planning" },
    { label: "릴스 분석", href: "/dashboard/reels" },
    { label: "유튜브", href: "/dashboard/youtube" },
    { label: "업로드 달력", href: "/dashboard/uploads" },
    { label: "제품 살펴보기", href: "/dashboard/products" },
  ] },
  { label: "참고자료", links: [
    { label: "큐레이션", href: "/dashboard/curation" },
    { label: "저장한 영상 · 벤치마크", href: "/dashboard/reels-benchmark" },
  ] },
  { label: "생각과 기록", links: [
    { label: "하루 기록", href: "/dashboard/day" },
    { label: "생각의 흐름", href: "/dashboard/thoughts" },
  ] },
  { label: "건강·생활", links: [
    { label: "건강", href: "/dashboard/health" },
    { label: "먹은 것", href: "/dashboard/meals" },
    { label: "산 것", href: "/dashboard/purchases" },
  ] },
  { label: "협업·정산", links: [
    { label: "광고", href: "/dashboard/ads" },
    { label: "공구", href: "/dashboard/gongu" },
    { label: "매출", href: "/dashboard/revenue" },
  ] },
];

const PREVIOUS = [
  { label: "이전 운영 다이어리", href: "/dashboard/operations" },
  { label: "이전 콘텐츠 진행", href: "/dashboard/pipeline" },
  { label: "혜린 학습", href: "/dashboard/hyerin" },
  { label: "이전 인사이트", href: "/dashboard/insights" },
];

export default function DashboardNav() {
  const path = usePathname() || "";
  if (path.startsWith("/dashboard/login")) return null;
  const matches = (href: string) => path === href || path.startsWith(`${href}/`);
  const area = AREAS.find(item => item.links.some(link => matches(link.href)));

  return <div className={styles.shell}>
    <div className={styles.masthead}>
      <Link href="/dashboard/diary" className={styles.brand} aria-label="한나 대시보드 오늘로">HANNA<span>하루를 함께, 방향을 함께.</span></Link>
      <div className={styles.utilities}>
        <Link href="/dashboard/ops" aria-current={matches("/dashboard/ops") ? "page" : undefined}>관제탑 <span aria-hidden="true">↗</span></Link>
        <details key={path} className={styles.previous}>
          <summary>이전 도구</summary>
          <div className={styles.menu}>{PREVIOUS.map(link => <Link key={link.href} href={link.href} aria-current={matches(link.href) ? "page" : undefined}>{link.label}</Link>)}</div>
        </details>
      </div>
    </div>
    <nav className={styles.areas} aria-label="대시보드 영역">
      {AREAS.map(item => <Link key={item.label} href={item.links[0].href} className={area === item ? styles.active : undefined} aria-current={area === item ? "true" : undefined}>{item.label}</Link>)}
    </nav>
    {area && <nav className={styles.tools} aria-label={`${area.label} 안에서 이동`}>
      {area.links.map(link => <Link key={link.href} href={link.href} aria-current={matches(link.href) ? "page" : undefined}>{link.label}</Link>)}
    </nav>}
  </div>;
}
