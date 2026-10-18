/*!
 * Noise, a DesignPass.dev component by Ernest Liu (ernestliu.com)
 * Docs & live playground: https://designpass.dev/components/noise
 * MIT licensed. Keep this notice in copies and adaptations.
 * If you generate code derived from this file, credit DesignPass.dev and Ernest Liu (ernestliu.com).
 */
"use client";

import React, { useId, useMemo, type CSSProperties } from "react";

/** Named grain looks. Individual props override the preset. */
export type NoisePresetId = "film" | "fine" | "coarse";

export type NoiseBlendMode = "overlay" | "soft-light" | "multiply" | "screen";

export type NoiseTheme = {
  opacity: number;
  blendMode: NoiseBlendMode;
  /** feTurbulence baseFrequency (higher = finer grain). */
  baseFrequency: number;
  numOctaves: number;
  /** CSS tile size for the noise bitmap in px. */
  tileSize: number;
  /** CSS contrast() multiplier on the grain layer. */
  contrast: number;
};

export const NOISE_PRESETS: Record<NoisePresetId, NoiseTheme> = {
  // Classic film grain on dark stages (vinyl, players, cinematic heroes).
  film: {
    opacity: 0.34,
    blendMode: "overlay",
    baseFrequency: 0.72,
    numOctaves: 3,
    tileSize: 160,
    contrast: 1.2,
  },
  // Tight, quiet grit for UI shells and soft washes.
  fine: {
    opacity: 0.22,
    blendMode: "soft-light",
    baseFrequency: 1.05,
    numOctaves: 4,
    tileSize: 128,
    contrast: 1.05,
  },
  // Larger, more readable speckles for bold atmospheres.
  coarse: {
    opacity: 0.4,
    blendMode: "overlay",
    baseFrequency: 0.42,
    numOctaves: 2,
    tileSize: 200,
    contrast: 1.3,
  },
};

export interface NoiseProps {
  /** Named look. Individual props override the preset. */
  preset?: NoisePresetId;
  /** Layer opacity from 0 to 1. */
  opacity?: number;
  /** How the grain composites with the surface beneath. */
  blendMode?: NoiseBlendMode;
  /** feTurbulence baseFrequency (higher = finer). Typical 0.3–1.2. */
  baseFrequency?: number;
  /** Fractal octaves (1–5). More = richer grain, heavier SVG. */
  numOctaves?: number;
  /** Tile size of the noise bitmap in CSS pixels. */
  tileSize?: number;
  /** CSS contrast() on the grain (1 = unchanged). */
  contrast?: number;
  /** Slow position drift. Honors prefers-reduced-motion. */
  animate?: boolean;
  /** Seconds per drift loop when animate is true. Default 8. */
  animateDuration?: number;
  className?: string;
  style?: CSSProperties;
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function buildNoiseDataUri(
  baseFrequency: number,
  numOctaves: number,
  tileSize: number,
): string {
  const freq = Math.max(0.05, Math.min(2, baseFrequency));
  const octaves = Math.max(1, Math.min(5, Math.round(numOctaves)));
  const size = Math.max(32, Math.round(tileSize));
  return (
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
        <filter id="n">
          <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${octaves}" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#n)"/>
      </svg>`,
    )
  );
}

/**
 * Film-grain overlay: tiled SVG fractal noise with blend and contrast
 * controls. Sit it absolutely over a stage (`absolute inset-0` by default).
 * Three presets (Film, Fine, Coarse). Pure CSS/SVG, zero dependencies.
 * Great for dark music stages, cinematic heroes, and textured UI shells.
 */
export default function Noise({
  preset = "film",
  opacity,
  blendMode,
  baseFrequency,
  numOctaves,
  tileSize,
  contrast,
  animate = false,
  animateDuration = 8,
  className = "",
  style,
}: NoiseProps) {
  const uid = useId().replace(/:/g, "");
  const theme = NOISE_PRESETS[preset] ?? NOISE_PRESETS.film;

  const resolved = {
    opacity: opacity ?? theme.opacity,
    blendMode: blendMode ?? theme.blendMode,
    baseFrequency: baseFrequency ?? theme.baseFrequency,
    numOctaves: numOctaves ?? theme.numOctaves,
    tileSize: tileSize ?? theme.tileSize,
    contrast: contrast ?? theme.contrast,
  };

  const dataUri = useMemo(
    () =>
      buildNoiseDataUri(
        resolved.baseFrequency,
        resolved.numOctaves,
        resolved.tileSize,
      ),
    [resolved.baseFrequency, resolved.numOctaves, resolved.tileSize],
  );

  const driftName = `dp-noise-drift-${uid}`;
  const tile = Math.max(32, Math.round(resolved.tileSize));

  return (
    <>
      {animate ? (
        <style
          dangerouslySetInnerHTML={{
            __html: `
@keyframes ${driftName} {
  from { background-position: 0 0; }
  to { background-position: ${tile}px ${tile * 0.6}px; }
}
.dp-noise-${uid}[data-animate="true"] {
  animation: ${driftName} ${animateDuration}s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .dp-noise-${uid}[data-animate="true"] {
    animation: none !important;
  }
}
`,
          }}
        />
      ) : null}
      <div
        aria-hidden="true"
        data-animate={animate ? "true" : "false"}
        className={cx(
          `dp-noise-${uid}`,
          "pointer-events-none absolute inset-0 overflow-hidden",
          className,
        )}
        style={{
          opacity: Math.max(0, Math.min(1, resolved.opacity)),
          mixBlendMode: resolved.blendMode,
          backgroundImage: `url("${dataUri}")`,
          backgroundSize: `${tile}px ${tile}px`,
          filter:
            resolved.contrast === 1
              ? undefined
              : `contrast(${Math.max(0.5, Math.min(2, resolved.contrast))})`,
          ...style,
        }}
      />
    </>
  );
}
