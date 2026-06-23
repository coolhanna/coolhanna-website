// 클라이언트 컴포넌트에서 대시보드 백엔드 mutation 호출 (proxy 경유, API 키 노출 X).

export async function callApi<T = unknown>(
  method: "POST" | "PATCH" | "DELETE" | "GET",
  path: string,
  body?: unknown,
): Promise<T> {
  const r = await fetch(`/api/dashboard/proxy/${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`API ${r.status}: ${text || path}`);
  }
  return r.json() as Promise<T>;
}

export function fmtWon(n: number | null | undefined): string {
  if (!n) return "—";
  return new Intl.NumberFormat("ko-KR").format(n) + "원";
}

export function fmtMonthDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const parts = iso.split("-");
  if (parts.length < 3) return iso;
  return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;
}

// 연락망(소통 채널) 선택지
export const CONTACT_CHANNELS = ["카톡", "인스타DM", "이메일", "전화", "기타"] as const;
