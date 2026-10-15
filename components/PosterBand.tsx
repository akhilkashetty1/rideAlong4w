import { cn } from "@/lib/utils";

/** The cover poster's lime title band, in a solid display face so it reads clearly. */
export default function PosterBand({ children, className, as: Tag = "h1" }: { children: React.ReactNode; className?: string; as?: "h1" | "h2" }) {
  return (
    <div className={cn("relative bg-neon px-4 py-3 text-center shadow-[0_0_50px_-10px_rgba(223,226,43,.65)]", className)}>
      <Tag className="font-display text-[clamp(1.2rem,4vw,2.1rem)] uppercase leading-[1.1] tracking-[0.04em] text-night">{children}</Tag>
    </div>
  );
}
