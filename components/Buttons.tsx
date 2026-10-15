import Link from "next/link";
import { cn } from "@/lib/utils";

/** 2W button language: lime for forward, orange for back. */
const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon disabled:cursor-not-allowed disabled:opacity-60 sm:text-base";
export const buttonStyles = {
  next: cn(base, "bg-neon text-night shadow-[0_10px_30px_-10px_rgba(223,226,43,.9)] hover:-translate-y-0.5 hover:bg-[#ecef3c]"),
  back: cn(base, "bg-az text-night hover:-translate-y-0.5 hover:bg-[#ffb534]"),
  ghost: cn(base, "border border-line bg-paper text-ink hover:border-ink"),
};

export function LinkButton({
  href,
  variant = "next",
  className,
  children,
}: {
  href: string;
  variant?: keyof typeof buttonStyles;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn(buttonStyles[variant], className)}>
      {children}
    </Link>
  );
}
