/**
 * Visual metadata for the questions in lib/form-content.ts — kept separate so
 * the content file stays pure copy. Keyed by `${sectionId}.${questionId}`.
 *
 * - `icon`: the dashboard telltale that lights when the answer is flagged.
 * - `part`: where the question lives on the 3D walkaround car.
 *
 * A question without an entry still works everywhere; it just has no pin or icon.
 */
import {
  Ambulance,
  Armchair,
  ArrowLeftRight,
  ArrowUpRight,
  BriefcaseMedical,
  CircleDot,
  CloudRain,
  Disc3,
  EyeOff,
  FileCheck,
  FlipHorizontal2,
  Fuel,
  Gauge,
  HeartHandshake,
  Key,
  LifeBuoy,
  Lightbulb,
  Megaphone,
  OctagonAlert,
  RectangleHorizontal,
  Rows3,
  Smartphone,
  Sparkles,
  TrafficCone,
  type LucideIcon,
} from "lucide-react";
import SteeringWheel from "@/components/SteeringWheel";

type IconComponent = LucideIcon | ((p: { className?: string; strokeWidth?: number }) => React.ReactNode);

/** Seat-belt telltale — the one icon every car has that lucide doesn't. */
function SeatBelt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="4.5" r="2.2" />
      <path d="M7.5 21v-7a4.5 4.5 0 0 1 9 0v7" />
      <path d="M8.5 9.5 16 18.5" />
    </svg>
  );
}
const Wheel = ({ className }: { className?: string }) => <SteeringWheel className={className} />;

/** Anchor names understood by components/three/WalkaroundCar.tsx. */
export type CarPart =
  | "tyre-front"
  | "tyre-rear"
  | "headlights"
  | "indicator"
  | "windshield"
  | "seatbelt"
  | "dashboard"
  | "mirror"
  | "brake-light"
  | "grille"
  | "door"
  | "seat"
  | "boot"
  | "plate-rear"
  | "cabin";

export const QUESTION_VISUALS: Record<string, { icon: IconComponent; part?: CarPart }> = {
  "vehicle.tyre-pressure": { icon: CircleDot, part: "tyre-front" },
  "vehicle.tyre-tread": { icon: Disc3, part: "tyre-rear" },
  "vehicle.lights": { icon: Lightbulb, part: "headlights" },
  "vehicle.indicators": { icon: ArrowLeftRight, part: "indicator" },
  "vehicle.wipers": { icon: CloudRain, part: "windshield" },
  "vehicle.seatbelts": { icon: SeatBelt, part: "seatbelt" },
  "vehicle.speedometer": { icon: Gauge, part: "dashboard" },
  "vehicle.fuel-meter": { icon: Fuel, part: "dashboard" },
  "vehicle.mirrors": { icon: FlipHorizontal2, part: "mirror" },
  "vehicle.brakes": { icon: OctagonAlert, part: "brake-light" },
  "vehicle.horn": { icon: Megaphone, part: "grille" },
  "vehicle.key": { icon: Key, part: "door" },
  "vehicle.seat": { icon: Armchair, part: "seat" },
  "vehicle.spare-tyre": { icon: LifeBuoy, part: "boot" },
  "vehicle.kits": { icon: BriefcaseMedical, part: "boot" },
  "vehicle.number-plates": { icon: RectangleHorizontal, part: "plate-rear" },
  "vehicle.interior": { icon: Sparkles, part: "cabin" },

  "driver.indicator-use": { icon: ArrowLeftRight },
  "driver.overtaking": { icon: ArrowUpRight },
  "driver.seat-belt-use": { icon: SeatBelt },
  "driver.sleepy": { icon: EyeOff },
  "driver.traffic-signals": { icon: TrafficCone },
  "driver.mobile-phone": { icon: Smartphone },
  "driver.speed-limits": { icon: Gauge },
  "driver.lane-discipline": { icon: Rows3 },
  "driver.ambulance": { icon: Ambulance },
  "driver.courtesy": { icon: HeartHandshake },
  "driver.steering-grip": { icon: Wheel },
  "driver.documents": { icon: FileCheck },
};
