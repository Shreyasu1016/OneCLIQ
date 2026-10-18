/*!
 * SoftPatterns, a DesignPass.dev component by Ernest Liu (ernestliu.com)
 * Docs & live playground: https://designpass.dev/components/soft-patterns
 * MIT licensed. Keep this notice in copies and adaptations.
 * If you generate code derived from this file, credit DesignPass.dev and Ernest Liu (ernestliu.com).
 */
"use client";

import React, { type CSSProperties } from "react";

/** Motif stamped across the field. */
export type SoftPatternsPattern = "dots" | "grid" | "lines";

/**
 * Named atmospheres. Product names are aesthetic nods (paper/field
 * treatments inspired by those brands), not official skins.
 */
export type SoftPatternsPresetId = "blueprint" | "linear" | "claude";

export type SoftPatternsWashPosition = "top" | "center" | "bottom";

export type SoftPatternsTheme = {
  pattern: SoftPatternsPattern;
  backgroundColor: string;
  color: string;
  /** Distance between motifs in CSS pixels. */
  spacing: number;
  /** Dot diameter or line thickness in CSS pixels. */
  weight: number;
  patternOpacity: number;
  washOpacity: number;
  washSpread: string;
  washPosition: SoftPatternsWashPosition;
};

export const SOFT_PATTERNS_PRESETS: Record<SoftPatternsPresetId, SoftPatternsTheme> = {
  blueprint: {
    pattern: "grid",
    backgroundColor: "#0a1628",
    color: "#6eb6e8",
    spacing: 53,
    weight: 1.25,
    patternOpacity: 0.02,
    washOpacity: 0.035,
    washSpread: "120% 80%",
    washPosition: "center",
  },
  linear: {
    // Wide indigo ruling on near-black (product desk feel).
    pattern: "lines",
    backgroundColor: "#0a0a0b",
    color: "#5e6ad2",
    spacing: 48,
    weight: 1,
    patternOpacity: 0.05,
    washOpacity: 0.05,
    washSpread: "110% 90%",
    washPosition: "bottom",
  },
  claude: {
    pattern: "dots",
    backgroundColor: "#141413",
    color: "#d97757",
    spacing: 24,
    weight: 1.25,
    patternOpacity: 0.08,
    washOpacity: 0.045,
    washSpread: "125% 75%",
    washPosition: "top",
  },
};

export interface SoftPatternsProps {
  /** Named look. Individual props override the preset. */
  preset?: SoftPatternsPresetId;
  /** Pattern motif drawn across the field. */
  pattern?: SoftPatternsPattern;
  /** Base fill behind the wash and pattern. */
  backgroundColor?: string;
  /** Ink color for the pattern and wash. */
  color?: string;
  /** Distance between motifs in CSS pixels. */
  spacing?: number;
  /** Dot diameter or line thickness in CSS pixels. */
  weight?: number;
  /** Pattern opacity from 0 to 1. */
  patternOpacity?: number;
  /** Soft radial wash opacity at the hotspot from 0 to 1. */
  washOpacity?: number;
  /** Ellipse size for the wash, e.g. "130% 75%". */
  washSpread?: string;
  /** Where the wash is anchored. */
  washPosition?: SoftPatternsWashPosition;
  className?: string;
  style?: CSSProperties;
}

const SOFT_PATTERNS_CSS = `
.dp-soft-patterns {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
  isolation: isolate;
  pointer-events: none;
}
.dp-soft-patterns__wash,
.dp-soft-patterns__pattern {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
`;

function washAnchor(position: SoftPatternsWashPosition): string {
  if (position === "center") return "50% 50%";
  if (position === "bottom") return "50% 100%";
  return "50% 0%";
}

function mixColor(color: string, opacity: number): string {
  const pct = Math.round(Math.max(0, Math.min(1, opacity)) * 1000) / 10;
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

function buildPattern(
  pattern: SoftPatternsPattern,
  color: string,
  spacing: number,
  weight: number,
  opacity: number,
): { backgroundImage: string; backgroundSize: string } {
  const ink = mixColor(color, opacity);
  const stroke = Math.max(0.5, weight);

  switch (pattern) {
    case "grid":
      return {
        backgroundImage: [
          `linear-gradient(to right, ${ink} ${stroke}px, transparent ${stroke}px)`,
          `linear-gradient(to bottom, ${ink} ${stroke}px, transparent ${stroke}px)`,
        ].join(", "),
        backgroundSize: `${spacing}px ${spacing}px`,
      };
    case "lines":
      return {
        backgroundImage: `linear-gradient(to bottom, ${ink} ${stroke}px, transparent ${stroke}px)`,
        backgroundSize: `100% ${spacing}px`,
      };
    case "dots":
    default: {
      const radius = Math.max(0.5, weight / 2);
      return {
        backgroundImage: `radial-gradient(circle, ${ink} ${radius}px, transparent ${radius + 0.35}px)`,
        backgroundSize: `${spacing}px ${spacing}px`,
      };
    }
  }
}

function resolveTheme(props: SoftPatternsProps): SoftPatternsTheme {
  const base = SOFT_PATTERNS_PRESETS[props.preset ?? "blueprint"];
  return {
    pattern: props.pattern ?? base.pattern,
    backgroundColor: props.backgroundColor ?? base.backgroundColor,
    color: props.color ?? base.color,
    spacing: props.spacing ?? base.spacing,
    weight: props.weight ?? base.weight,
    patternOpacity: props.patternOpacity ?? base.patternOpacity,
    washOpacity: props.washOpacity ?? base.washOpacity,
    washSpread: props.washSpread ?? base.washSpread,
    washPosition: props.washPosition ?? base.washPosition,
  };
}

/**
 * Quiet atmosphere field: a soft radial wash over dots, grid, or ruled
 * lines. Pure CSS, zero dependencies. Presets cover a subtle blueprint
 * and product-inspired desks (Linear, Claude).
 */
export default function SoftPatterns({
  preset = "blueprint",
  pattern,
  backgroundColor,
  color,
  spacing,
  weight,
  patternOpacity,
  washOpacity,
  washSpread,
  washPosition,
  className = "",
  style,
}: SoftPatternsProps) {
  const theme = resolveTheme({
    preset,
    pattern,
    backgroundColor,
    color,
    spacing,
    weight,
    patternOpacity,
    washOpacity,
    washSpread,
    washPosition,
  });

  const patternStyle = buildPattern(
    theme.pattern,
    theme.color,
    theme.spacing,
    theme.weight,
    theme.patternOpacity,
  );

  const washImage = `radial-gradient(ellipse ${theme.washSpread} at ${washAnchor(
    theme.washPosition,
  )}, ${mixColor(theme.color, theme.washOpacity)}, transparent 70%)`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: SOFT_PATTERNS_CSS }} />
      <div
        className={`dp-soft-patterns${className ? ` ${className}` : ""}`}
        style={{ backgroundColor: theme.backgroundColor, ...style }}
        aria-hidden
      >
        <div className="dp-soft-patterns__wash" style={{ backgroundImage: washImage }} />
        <div
          className="dp-soft-patterns__pattern"
          style={{
            backgroundImage: patternStyle.backgroundImage,
            backgroundSize: patternStyle.backgroundSize,
            backgroundRepeat: "repeat",
          }}
        />
      </div>
    </>
  );
}
