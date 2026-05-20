// Server Component에서만 사용 (API 키 클라이언트 노출 X).
// 클라이언트 mutation은 /api/dashboard/proxy/[path]로 호출.

const API_URL = process.env.DASHBOARD_API_URL || "http://127.0.0.1:8000";
const API_KEY = process.env.DASHBOARD_API_KEY || "";

export async function api<T = any>(path: string): Promise<T | { error: string }> {
  if (!API_KEY) return { error: "DASHBOARD_API_KEY 미설정 (Vercel 환경 변수)" };
  try {
    const r = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      cache: "no-store",
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
  // v5 추가
  choresTodo: () => api<any>("/api/dashboard/chores/todo"),
  choresShop: () => api<any>("/api/dashboard/chores/shop"),
  quickTasks: () => api<any>("/api/dashboard/quick-tasks"),
  weeklyRoutines: () => api<any>("/api/dashboard/weekly-routines"),
  ideasRecent: () => api<any>("/api/dashboard/ideas-recent?limit=3"),
};
