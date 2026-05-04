import data from "@/data/newsletters.json";

export type Newsletter = {
  title: string;
  illustration: string;
  url: string;
};

export const SUBSCRIBE_URL = "https://page.stibee.com/subscriptions/PLACEHOLDER";

export const SOCIAL = {
  instagram: "https://instagram.com/coolhanna",
  youtube: "https://youtube.com/@coolhanna",
};

export function getAllNewsletters(): Newsletter[] {
  return data as Newsletter[];
}

export function getRecentNewsletters(count = 6): Newsletter[] {
  return getAllNewsletters().slice(0, count);
}
