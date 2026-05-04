import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-30 bg-paper/85 backdrop-blur-md border-b border-rule">
      <div className="mx-auto max-w-page px-5 sm:px-8 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="text-base sm:text-lg tracking-tight font-semibold underline-grow"
        >
          쿨한나 뉴스레터
        </Link>
        <nav aria-label="Main" className="flex items-center gap-6 text-sm">
          <Link href="/archive" className="underline-grow">지난 편</Link>
          <Link href="/about" className="underline-grow">소개</Link>
        </nav>
      </div>
    </header>
  );
}
