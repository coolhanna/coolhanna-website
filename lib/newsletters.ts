import data from "@/data/newsletters.json";

export type Newsletter = {
  id: number;
  title: string;
  date: string;
  excerpt: string;
  url: string;
};

export const SUBSCRIBE_URL = "https://page.stibee.com/subscriptions/PLACEHOLDER";

export const SOCIAL = {
  instagram: "https://instagram.com/coolhanna",
  youtube: "https://youtube.com/@coolhanna",
};

export function getAllNewsletters(): Newsletter[] {
  return [...(data as Newsletter[])].sort((a, b) => b.id - a.id);
}

export function getRecentNewsletters(count = 3): Newsletter[] {
  return getAllNewsletters().slice(0, count);
}

export function formatKoreanDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}
