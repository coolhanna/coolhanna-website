const KST = "Asia/Seoul";

const ISO_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: KST,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function isoKst(date: Date): string {
  const parts = Object.fromEntries(
    ISO_PARTS.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatKstDateKo(date: Date): string {
  return date.toLocaleDateString("ko-KR", {
    timeZone: KST,
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

export function formatKstTimeKo(date: Date): string {
  return date.toLocaleString("ko-KR", {
    timeZone: KST,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
