import data from "@/data/newsletters.json";

export type Newsletter = {
  title: string;
  illustration: string;
  url: string;
};

export const SUBSCRIBE_URL = "https://page.stibee.com/subscriptions/457067";

export const SOCIAL = {
  instagram: "https://www.instagram.com/readwrite_grow",
  youtube: "https://www.youtube.com/@collhanna84",
};

export function getAllNewsletters(): Newsletter[] {
  return data as Newsletter[];
}

export function getRecentNewsletters(count = 6): Newsletter[] {
  return getAllNewsletters().slice(0, count);
}

export function getVolNumber(item: Newsletter): number {
  const match = item.illustration.match(/(\d+)\.[^.]+$/);
  return match ? parseInt(match[1], 10) : 0;
}
