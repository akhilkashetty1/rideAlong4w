import { cn } from "@/lib/utils";
import SteeringWheel from "@/components/SteeringWheel";

/**
 * The page card: the 2W black/red double frame, with the guidelines PDF's
 * half-hidden steering wheels peeking in from the edges and a steering-wheel
 * watermark where the 2W form had its rider.
 */
export default function FramedCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative mx-auto w-full max-w-[1000px]", className)}>
      <SteeringWheel className="no-print pointer-events-none absolute -left-9 top-28 hidden h-20 w-20 text-neon/70 drop-shadow-[0_0_12px_rgba(223,226,43,.5)] md:block" />
      <SteeringWheel className="no-print pointer-events-none absolute -right-9 top-[46%] hidden h-20 w-20 rotate-45 text-neon/70 drop-shadow-[0_0_12px_rgba(223,226,43,.5)] md:block" />
      <div className="frame relative overflow-clip p-4 sm:p-7">
        <SteeringWheel className="pointer-events-none absolute bottom-6 left-1/2 h-72 w-72 -translate-x-1/2 text-ink opacity-[0.05]" />
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}
