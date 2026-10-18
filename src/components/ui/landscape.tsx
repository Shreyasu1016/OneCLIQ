import Image from "next/image";
import { ART } from "@/lib/art";
import { cn } from "@/lib/cn";

type Variant = "hero" | "footer";

const PALETTES: Record<Variant, {
  skyTop: string;
  skyLow: string;
  cloud: string;
  far: string;
  mid: string;
  near: string;
  pine: string;
  pineLit: string;
  flower: string;
}> = {
  // Clear morning (Harmoniq hero).
  hero: {
    skyTop: "#cfe0f2",
    skyLow: "#eef2f0",
    cloud: "#ffffff",
    far: "#a9bfd6",
    mid: "#88aa83",
    near: "#5e8b4f",
    pine: "#24452f",
    pineLit: "#3b6845",
    flower: "#f4f1ea",
  },
  // Lilac dusk meadow (micro footer).
  footer: {
    skyTop: "#f0d9c8",
    skyLow: "#e9d6ee",
    cloud: "#fbeee6",
    far: "#b9a3d3",
    mid: "#7fae5f",
    near: "#4f8a3f",
    pine: "#2a4a2a",
    pineLit: "#4c7a3a",
    flower: "#b58fe0",
  },
};

/** Tiny seeded PRNG so the trees land in the same place on server and client. */
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function pinePath(x: number, base: number, h: number, w: number) {
  // Stacked, slightly ragged tiers, like a painted pine.
  const tiers = 5;
  let d = "";
  for (let t = 0; t < tiers; t++) {
    const top = base - h + (h * t) / (tiers + 0.6);
    const bottom = top + h / 2.6;
    const half = (w / 2) * (0.35 + (t / tiers) * 0.75);
    d += `M${x} ${top}L${x - half} ${bottom}Q${x} ${bottom - 6} ${x + half} ${bottom}Z`;
  }
  d += `M${x - 2.5} ${base - h * 0.12}h5v${h * 0.14}h-5Z`;
  return d;
}

function forest(seed: number, from: number, to: number, base: number, count: number, scale: number) {
  const r = rng(seed);
  return Array.from({ length: count }, () => {
    const x = from + r() * (to - from);
    const h = (90 + r() * 170) * scale;
    return { x, h, w: h * (0.42 + r() * 0.12), base: base + r() * 30 };
  }).sort((a, b) => a.base - b.base);
}

function Fallback({ variant }: { variant: Variant }) {
  const p = PALETTES[variant];
  const id = `ls-${variant}`;
  const left = forest(variant === "hero" ? 7 : 11, 20, 520, 470, 16, 1);
  const right = forest(variant === "hero" ? 19 : 23, 1100, 1590, 470, 16, 1);
  const back = forest(variant === "hero" ? 31 : 37, 0, 1600, 420, 26, 0.45);
  const flowers = rng(variant === "hero" ? 5 : 9);

  return (
    <svg viewBox="0 0 1600 600" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.skyTop} stopOpacity="0" />
          <stop offset=".35" stopColor={p.skyTop} />
          <stop offset=".8" stopColor={p.skyLow} />
        </linearGradient>
        <filter id={`${id}-paint`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="9" />
        </filter>
        <filter id={`${id}-cloud`} x="-20%" y="-50%" width="140%" height="200%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="8" />
          <feDisplacementMap in="SourceGraphic" scale="40" />
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      <rect width="1600" height="600" fill={`url(#${id}-sky)`} />

      <g filter={`url(#${id}-cloud)`} fill={p.cloud} opacity=".95">
        <ellipse cx="280" cy="300" rx="260" ry="55" />
        <ellipse cx="420" cy="265" rx="150" ry="60" />
        <ellipse cx="1180" cy="290" rx="300" ry="50" />
        <ellipse cx="1320" cy="250" rx="140" ry="55" />
        <ellipse cx="780" cy="335" rx="380" ry="38" />
      </g>

      <g filter={`url(#${id}-paint)`}>
        <path
          d="M0 420 L120 360 L230 395 L360 330 L470 380 L600 350 L720 390 L860 340 L990 385 L1120 345 L1260 380 L1380 335 L1500 370 L1600 350 V600 H0Z"
          fill={p.far}
          opacity=".75"
        />
        {back.map((t, i) => (
          <path key={`b${i}`} d={pinePath(t.x, t.base, t.h, t.w)} fill={p.pineLit} opacity=".55" />
        ))}
        <path d="M0 470 C 260 430 520 455 800 445 C 1080 435 1330 420 1600 450 V600 H0Z" fill={p.mid} />
        {[...left, ...right].map((t, i) => (
          <g key={`t${i}`}>
            <path d={pinePath(t.x, t.base, t.h, t.w)} fill={p.pine} />
            <path d={pinePath(t.x + t.w * 0.08, t.base, t.h * 0.96, t.w * 0.45)} fill={p.pineLit} opacity=".5" />
          </g>
        ))}
        <path d="M0 535 C 300 505 620 520 900 515 C 1200 510 1420 500 1600 520 V600 H0Z" fill={p.near} />
        {Array.from({ length: 90 }, (_, i) => (
          <circle
            key={`f${i}`}
            cx={flowers() * 1600}
            cy={530 + flowers() * 70}
            r={1.5 + flowers() * 3}
            fill={p.flower}
            opacity={0.5 + flowers() * 0.5}
          />
        ))}
      </g>

      <g fill="none" stroke={p.pine} strokeWidth="2" strokeLinecap="round" opacity=".6">
        {[
          [880, 230],
          [910, 245],
          [945, 222],
          [1010, 255],
          [1060, 238],
        ].map(([x, y]) => (
          <path key={`${x}`} d={`M${x - 7} ${y - 3} q 7 -5 7 3 q 0 -8 7 -3`} />
        ))}
      </g>
    </svg>
  );
}

/**
 * Painted scene. Renders the AI artwork from src/lib/art.ts when it's set,
 * otherwise a layered SVG in the same palette.
 */
export function Landscape({ variant, className, priority }: { variant: Variant; className?: string; priority?: boolean }) {
  const src = ART[variant];
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {src ? (
        <Image src={src} alt="" fill priority={priority} sizes="100vw" className="object-cover object-bottom" />
      ) : (
        <Fallback variant={variant} />
      )}
    </div>
  );
}
