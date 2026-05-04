import type { Metadata } from "next";
import { getAllNewsletters } from "@/lib/newsletters";
import { ArchiveList } from "@/components/ArchiveList";

export const metadata: Metadata = {
  title: "지난 편",
  description: "쿨한나 뉴스레터 22편 아카이브.",
  alternates: { canonical: "/archive" },
};

export default function ArchivePage() {
  const items = getAllNewsletters();
  return (
    <>
      <section className="border-b border-rule">
        <div className="mx-auto max-w-page px-5 sm:px-8 pt-14 sm:pt-20 pb-10 sm:pb-14">
          <p className="text-xs sm:text-sm font-mono tracking-widest text-muted uppercase mb-5">
            Archive · {items.length} issues
          </p>
          <h1 className="text-headline font-semibold tracking-tight text-balance">
            지난 편지를 모두 모았습니다.
          </h1>
          <p className="mt-5 max-w-prose text-base sm:text-lg text-muted leading-relaxed">
            제목이나 한 줄에서 검색할 수 있어요. 한 편을 누르면 새 탭에서 본문이 열립니다.
          </p>
        </div>
      </section>

      <section className="pt-10 sm:pt-14">
        <ArchiveList items={items} />
      </section>
    </>
  );
}
