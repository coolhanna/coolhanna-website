import type { Newsletter } from "@/lib/newsletters";
import { formatKoreanDate } from "@/lib/newsletters";

type Props = {
  item: Newsletter;
  index?: number;
};

export function NewsletterRow({ item, index }: Props) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="group block border-t border-rule py-6 sm:py-8 transition-colors hover:bg-ink hover:text-paper"
    >
      <div className="mx-auto max-w-page px-5 sm:px-8 grid grid-cols-12 gap-4 items-baseline">
        <span className="col-span-2 sm:col-span-1 text-xs font-mono tracking-widest text-muted group-hover:text-paper/70">
          {String(index ?? item.id).padStart(2, "0")}
        </span>
        <h3 className="col-span-10 sm:col-span-8 text-xl sm:text-2xl font-semibold tracking-tight text-balance">
          {item.title}
        </h3>
        <span className="hidden sm:block sm:col-span-2 text-sm font-mono text-muted group-hover:text-paper/70 text-right">
          {formatKoreanDate(item.date)}
        </span>
        <span className="hidden sm:flex sm:col-span-1 justify-end text-sm">
          <span className="opacity-60 group-hover:opacity-100 transition">읽기 →</span>
        </span>
        <p className="col-span-12 sm:col-span-10 sm:col-start-2 mt-2 text-sm sm:text-base text-muted group-hover:text-paper/80 leading-relaxed">
          {item.excerpt}
        </p>
        <span className="col-span-12 sm:hidden mt-3 text-xs font-mono text-muted group-hover:text-paper/70">
          {formatKoreanDate(item.date)}  ·  읽기 →
        </span>
      </div>
    </a>
  );
}
