// Mac mini의 FastAPI 호출 헬퍼 (서버 컴포넌트에서만 사용 — API 키 클라이언트 노출 X)

const API_URL = process.env.DASHBOARD_API_URL || "http://127.0.0.1:8000";
const API_KEY = process.env.DASHBOARD_API_KEY || "";

export async function api<T = any>(path: string): Promise<T | { error: string }> {
  if (!API_KEY) return { error: "DASHBOARD_API_KEY 미설정 (Vercel 환경 변수)" };
  try {
    const r = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      // 1분 재검증 — API 자체도 1분 캐시라 실시간성 충분
      next: { revalidate: 60 },
    });
    if (!r.ok) return { error: `API ${r.status}: ${path}` };
    return await r.json();
  } catch (e: any) {
    return { error: e?.message || "fetch 실패" };
  }
}

export const dash = {
  today: () => api<any>("/api/dashboard/today"),
  recommendation: () => api<any>("/api/dashboard/recommendation"),
  weekProgress: () => api<any>("/api/dashboard/week-progress"),
  schedule: () => api<any>("/api/dashboard/schedule"),
  incomplete: () => api<any>("/api/dashboard/incomplete?limit=5"),
  stuck: () => api<any>("/api/dashboard/stuck"),
  activeCards: () => api<any>("/api/dashboard/active-cards"),
  cashflow: () => api<any>("/api/dashboard/cashflow"),
  healthTrend: () => api<any>("/api/dashboard/health-trend"),
  calendar: () => api<any>("/api/dashboard/calendar"),
};
