import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-30 bg-paper/85 backdrop-blur-md border-b border-rule">
      <div className="mx-auto max-w-page px-5 sm:px-8 h-14 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="text-[13px] sm:text-base lg:text-lg tracking-tight font-semibold underline-grow whitespace-nowrap"
        >
          쿨한나의 읽고, 쓰고, 키우는 뉴스레터
        </Link>
        <nav aria-label="Main" className="flex items-center gap-5 sm:gap-6 text-sm shrink-0">
          <Link href="/archive" className="underline-grow whitespace-nowrap">지난 편</Link>
        </nav>
      </div>
    </header>
  );
}
