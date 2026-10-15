import Image from "next/image";
import cover from "@/public/images/cover.jpg";
import NeonRoad from "@/components/three/NeonRoad";
import IgnitionButton from "@/components/IgnitionButton";
import { FORM_META } from "@/lib/form-content";

/** Same as the 2W landing — the cover poster and a Start button — over a live neon road, with push-to-start. */
export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-10 px-4 py-10">
      <NeonRoad />
      <Image
        src={cover}
        alt={`${FORM_META.posterTitle.join(" — ")} cover`}
        priority
        placeholder="blur"
        sizes="(min-width: 1024px) 460px, (min-width: 768px) 400px, 82vw"
        className="poster-pulse h-auto w-[82vw] max-w-[460px] rounded-2xl md:max-w-[400px] lg:max-w-[460px]"
      />
      <IgnitionButton href="/guidelines/vehicle" />
    </main>
  );
}
