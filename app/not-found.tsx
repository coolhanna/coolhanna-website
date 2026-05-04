import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-page px-5 sm:px-8 pt-24 pb-32">
      <p className="text-xs font-mono tracking-widest text-muted uppercase mb-4">404</p>
      <h1 className="text-headline font-semibold tracking-tight">
        이 편지는 아직 보내지 않았어요.
      </h1>
      <p className="mt-5 text-lg text-muted">
        링크가 바뀌었거나, 아직 없는 페이지입니다.
      </p>
      <div className="mt-10 flex gap-4 text-base">
        <Link href="/" className="underline-grow">홈으로</Link>
        <Link href="/archive" className="underline-grow">지난 편 보기</Link>
      </div>
    </section>
  );
}
