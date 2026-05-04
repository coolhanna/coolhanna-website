import type { Metadata } from "next";
import { SOCIAL } from "@/lib/newsletters";
import { SubscribeButton } from "@/components/SubscribeButton";

export const metadata: Metadata = {
  title: "소개",
  description: "쿨한나 — 사교육 없이 13세 영재 키운 엄마, 매주 월요일 진심으로 씁니다.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <section>
      <div className="mx-auto max-w-page px-5 sm:px-8 pt-16 sm:pt-24 pb-20">
        <p className="text-xs sm:text-sm font-mono tracking-widest text-muted uppercase mb-6">
          About
        </p>
        <h1 className="text-display font-semibold tracking-tight text-balance leading-[1.05]">
          안녕하세요,<br />
          <span className="italic font-serif">쿨한나</span>입니다.
        </h1>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-6 text-lg sm:text-xl leading-relaxed text-balance">
            <p>
              사교육 없이 13세 영재를 키운 엄마입니다.
              학원 대신 책장이, 문제집 대신 식탁의 대화가 더 큰 일을 했습니다.
            </p>
            <p>
              매주 월요일, 가장 솔직한 문장으로 한 통의 편지를 보냅니다.
              비결은 없습니다. 다만 매일 반복한 평범한 것들이 있을 뿐입니다.
            </p>
            <p className="text-muted">
              새 편지를 받고 싶으면 아래 버튼으로 구독해주세요. 광고는 없고, 발송은 월요일 한 번뿐입니다.
            </p>
            <div className="pt-4">
              <SubscribeButton size="lg">무료 구독하기</SubscribeButton>
            </div>
          </div>

          <aside className="lg:col-span-4 lg:border-l lg:border-rule lg:pl-8 space-y-8">
            <div>
              <p className="text-xs font-mono tracking-widest text-muted uppercase mb-2">Channels</p>
              <ul className="space-y-3 text-base">
                <li>
                  <a href={SOCIAL.instagram} target="_blank" rel="noreferrer" className="underline-grow">
                    Instagram · @coolhanna
                  </a>
                </li>
                <li>
                  <a href={SOCIAL.youtube} target="_blank" rel="noreferrer" className="underline-grow">
                    YouTube · 쿨한나 채널
                  </a>
                </li>
                <li>
                  <a href="mailto:hello@coolhanna.com" className="underline-grow">
                    Email · hello@coolhanna.com
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-mono tracking-widest text-muted uppercase mb-2">Topics</p>
              <ul className="text-base text-muted leading-relaxed">
                <li>· 사교육 없는 학습 환경</li>
                <li>· 자기주도 학습</li>
                <li>· 책육아와 대화 육아</li>
                <li>· 부모의 마음 다루기</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
