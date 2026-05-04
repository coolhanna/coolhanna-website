import Link from "next/link";
import { SOCIAL } from "@/lib/newsletters";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-rule mt-24">
      <div className="mx-auto max-w-page px-5 sm:px-8 py-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <div>
          <p className="text-2xl font-semibold tracking-tight">쿨한나</p>
          <p className="text-sm text-muted mt-1">매주 월요일, 진심으로 씁니다.</p>
        </div>
        <div className="flex flex-col sm:items-end gap-2 text-sm">
          <div className="flex gap-5">
            <a href={SOCIAL.instagram} target="_blank" rel="noreferrer" className="underline-grow">
              Instagram
            </a>
            <a href={SOCIAL.youtube} target="_blank" rel="noreferrer" className="underline-grow">
              YouTube
            </a>
            <Link href="/about" className="underline-grow">소개</Link>
          </div>
          <p className="text-muted">© {year} 쿨한나</p>
        </div>
      </div>
    </footer>
  );
}
