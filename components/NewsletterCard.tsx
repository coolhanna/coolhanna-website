import type { Newsletter } from "@/lib/newsletters";
import { getVolNumber } from "@/lib/newsletters";

type Props = {
  item: Newsletter;
  priority?: boolean;
};

export function NewsletterCard({ item, priority = false }: Props) {
  const vol = getVolNumber(item);
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="group block"
    >
      <div className="aspect-[3/2] bg-[#efece4] overflow-hidden">
        <img
          src={item.illustration}
          alt={item.title}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
      </div>
      <h3 className="mt-4 sm:mt-5 text-lg sm:text-xl font-semibold tracking-tight text-balance leading-snug">
        <span className="underline-grow">
          <span className="text-muted font-normal mr-1">[vol.{vol}]</span>
          {item.title}
        </span>
      </h3>
    </a>
  );
}
