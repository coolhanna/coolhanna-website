import type { Newsletter } from "@/lib/newsletters";

type Props = {
  item: Newsletter;
  priority?: boolean;
};

export function NewsletterCard({ item, priority = false }: Props) {
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
        <span className="underline-grow">{item.title}</span>
      </h3>
    </a>
  );
}
