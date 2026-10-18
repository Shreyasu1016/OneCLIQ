/*!
 * JellyButton, a DesignPass.dev component by Ernest Liu (ernestliu.com)
 * Docs & live playground: https://designpass.dev/components/jelly-button
 * MIT licensed. Keep this notice in copies and adaptations.
 * If you generate code derived from this file, credit DesignPass.dev and Ernest Liu (ernestliu.com).
 */
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import Magnet from "./Magnet";

export interface JellyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** Scale the button grows to on hover (bouncy spring, slight overshoot). */
  hoverScale?: number;
  /** How much the button squishes while pressed: 0.08 means 8% wider and
   * 12% flatter, like jelly under a thumb. */
  squish?: number;
  /** Spring stiffness for hover/press motion. Higher snaps faster. */
  stiffness?: number;
  /** How much the button wobbles on release. Higher is wobblier. 0–1. */
  jiggle?: number;
  /** Let the button lean toward a nearby cursor (via Magnet). */
  magnet?: boolean;
  /** Magnet attraction zone as a multiple of the button's half-size. */
  magnetRadius?: number;
  /** How hard the magnet pulls (0–1-ish). Default 0.35. */
  magnetPullFactor?: number;
  wrapperClassName?: string;
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

// Bouncy spring shared by hover growth and press squish, so releasing a
// press wobbles back like jelly instead of easing home.
const DEFAULT_STIFFNESS = 0.22;
const DEFAULT_JIGGLE = 0.56;

function jiggleToDamping(jiggle: number) {
  return 0.9 - jiggle * 0.5;
}

export default function JellyButton({
  children,
  hoverScale = 1.05,
  squish = 0.08,
  stiffness = DEFAULT_STIFFNESS,
  jiggle = DEFAULT_JIGGLE,
  magnet = true,
  magnetRadius = 1.75,
  magnetPullFactor = 0.35,
  wrapperClassName = "",
  className = "",
  style,
  disabled,
  ...props
}: JellyButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const damping = jiggleToDamping(jiggle);

  // Spring state lives outside React, no re-render per frame.
  const physics = useRef({
    scale: 1,
    scaleVelocity: 0,
    scaleTarget: 1,
    squish: 0,
    squishVelocity: 0,
    squishTarget: 0,
    hovering: false,
    pressing: false,
    frame: 0,
    running: false,
    reducedMotion: false,
  });

  const render = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    const state = physics.current;
    // Squish preserves visual volume: wider exactly as much as it flattens.
    const sx = state.scale * (1 + state.squish);
    const sy = state.scale * (1 - state.squish);
    button.style.transform = `scale(${sx}, ${sy})`;
  }, []);

  const wake = useCallback(() => {
    const state = physics.current;

    if (state.reducedMotion) {
      state.scale = state.scaleTarget;
      state.squish = state.squishTarget;
      render();
      return;
    }
    if (state.running) return;
    state.running = true;

    const tick = () => {
      state.scaleVelocity =
        (state.scaleVelocity + (state.scaleTarget - state.scale) * stiffness) * damping;
      state.scale += state.scaleVelocity;
      state.squishVelocity =
        (state.squishVelocity + (state.squishTarget - state.squish) * stiffness) * damping;
      state.squish = clamp(state.squish + state.squishVelocity, -0.4, 0.4);
      render();

      const settled =
        Math.abs(state.scaleVelocity) < 0.0005 &&
        Math.abs(state.scaleTarget - state.scale) < 0.0005 &&
        Math.abs(state.squishVelocity) < 0.0005 &&
        Math.abs(state.squishTarget - state.squish) < 0.0005;

      if (settled) {
        state.scale = state.scaleTarget;
        state.squish = state.squishTarget;
        render();
        state.running = false;
        return;
      }
      state.frame = requestAnimationFrame(tick);
    };

    state.frame = requestAnimationFrame(tick);
  }, [render, stiffness, damping]);

  useEffect(() => {
    const state = physics.current;
    state.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return () => {
      cancelAnimationFrame(state.frame);
      state.running = false;
    };
  }, []);

  const retarget = useCallback(() => {
    const state = physics.current;
    state.scaleTarget = state.hovering && !disabled ? hoverScale : 1;
    state.squishTarget = state.pressing && !disabled ? squish : 0;
    wake();
  }, [disabled, hoverScale, squish, wake]);

  function setHovering(next: boolean) {
    physics.current.hovering = next;
    if (!next) physics.current.pressing = false;
    retarget();
  }

  function setPressing(next: boolean) {
    physics.current.pressing = next;
    retarget();
  }

  const button = (
    <button
      ref={buttonRef}
      disabled={disabled}
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
      onPointerDown={() => setPressing(true)}
      onPointerUp={() => setPressing(false)}
      onPointerCancel={() => setPressing(false)}
      // Keyboard activation squishes too, so Enter/Space feel the same.
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") setPressing(true);
      }}
      onKeyUp={() => setPressing(false)}
      onBlur={() => setPressing(false)}
      style={
        {
          // Follows host theme tokens when present; standalone fallback is
          // a purple pill with white text.
          "--jb-bg": "var(--dp-accent, #a05cff)",
          "--jb-ink": "var(--dp-accent-contrast, #fff)",
          ...style,
        } as React.CSSProperties
      }
      className={`inline-flex cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-full bg-[var(--jb-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--jb-ink)] outline-none will-change-transform focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--jb-bg)_55%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );

  if (!magnet || disabled) {
    return <span className={`inline-block ${wrapperClassName}`}>{button}</span>;
  }

  return (
    <Magnet
      radius={magnetRadius}
      pullFactor={magnetPullFactor}
      tiltStrength={0}
      glare={false}
      lift={1}
      wrapperClassName={`inline-block ${wrapperClassName}`}
    >
      {button}
    </Magnet>
  );
}
