import { SUBSCRIBE_URL } from "@/lib/newsletters";

type Props = {
  variant?: "primary" | "ghost" | "inverse";
  size?: "md" | "lg";
  children?: React.ReactNode;
};

export function SubscribeButton({ variant = "primary", size = "lg", children }: Props) {
  const base =
    "inline-flex items-center gap-2 font-medium tracking-tight transition-colors duration-200";
  const sizes = {
    md: "px-5 py-2.5 text-sm",
    lg: "px-7 py-4 text-base sm:text-lg",
  };
  const variants = {
    primary: "bg-ink text-paper hover:bg-black",
    ghost: "border border-ink text-ink hover:bg-ink hover:text-paper",
    inverse: "border border-paper text-paper hover:bg-paper hover:text-ink",
  };
  return (
    <a
      href={SUBSCRIBE_URL}
      target="_blank"
      rel="noreferrer"
      className={`${base} ${sizes[size]} ${variants[variant]}`}
    >
      {children ?? "구독하기"}
      <span aria-hidden className="text-lg leading-none">→</span>
    </a>
  );
}
