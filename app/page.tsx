import { getRecentNewsletters } from "@/lib/newsletters";
import { SubscribeButton } from "@/components/SubscribeButton";
import { NewsletterCard } from "@/components/NewsletterCard";
import Link from "next/link";

export default function HomePage() {
  const recent = getRecentNewsletters(6);

  return (
    <>
      <section className="border-b border-rule">
        <div className="mx-auto max-w-page px-5 sm:px-8 pt-16 sm:pt-24 pb-16 sm:pb-24">
          <p className="text-xs sm:text-sm font-mono tracking-widest text-muted uppercase mb-6">
            Newsletter · 매주 월요일 아침 8시
          </p>
          <h1 className="text-display font-semibold tracking-tight text-balance leading-[1.4]">
            매주 월요일,<br />
            <span className="italic font-serif">진심으로</span> 씁니다.
          </h1>
          <p className="mt-8 max-w-prose text-lg sm:text-xl text-muted leading-relaxed">
            사교육 대신 책과 대화로 아이를 키워 온{" "}
            <br className="hidden sm:block" />
            엄마의 솔직한 기록을 편지처럼 보내드립니다.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 sm:items-center">
            <SubscribeButton size="lg">무료로 구독하기</SubscribeButton>
            <Link
              href="/archive"
              className="inline-flex items-center gap-2 px-2 py-2 text-base underline-grow"
            >
              지난 편 22개 보기 <span aria-hidden>↓</span>
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="recent-heading" className="pt-16 sm:pt-20">
        <div className="mx-auto max-w-page px-5 sm:px-8 pb-10 sm:pb-12 flex items-end justify-between gap-6">
          <div>
            <p className="text-xs sm:text-sm font-mono tracking-widest text-muted uppercase mb-3">
              Recent Issues
            </p>
            <h2 id="recent-heading" className="text-headline font-semibold tracking-tight">
              최신 뉴스레터
            </h2>
          </div>
          <Link href="/archive" className="text-sm underline-grow whitespace-nowrap pb-2">
            전체 보기 →
          </Link>
        </div>

        <ul className="mx-auto max-w-page px-5 sm:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12 sm:gap-y-14">
          {recent.map((item, i) => (
            <li key={item.illustration}>
              <NewsletterCard item={item} priority={i < 3} />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-24 sm:mt-32">
        <div className="mx-auto max-w-page px-5 sm:px-8">
          <div className="bg-ink text-paper px-6 sm:px-12 py-14 sm:py-20 flex flex-col items-start gap-6">
            <p className="text-xs sm:text-sm font-mono tracking-widest text-paper/60 uppercase">
              Subscribe
            </p>
            <h2 className="text-headline font-semibold tracking-tight text-balance leading-[1.4]">
              매주 월요일 아침 8시,<br />
              한 통의 편지가 도착합니다.
            </h2>
            <p className="max-w-prose text-paper/75 text-base sm:text-lg leading-relaxed">
              광고 없음. 언제든 구독 취소 가능. 발송은 월요일 한 번뿐입니다.
            </p>
            <SubscribeButton variant="inverse" size="lg">구독하기</SubscribeButton>
          </div>
        </div>
      </section>
    </>
  );
}
