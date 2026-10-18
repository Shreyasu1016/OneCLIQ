/*!
 * Magnet, a DesignPass.dev component by Ernest Liu (ernestliu.com)
 * Docs & live playground: https://designpass.dev/components/magnet
 * MIT licensed. Keep this notice in copies and adaptations.
 * If you generate code derived from this file, credit DesignPass.dev and Ernest Liu (ernestliu.com).
 */
"use client";

import React, { useEffect, useRef, type HTMLAttributes, type ReactNode } from "react";

export interface MagnetProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /**
   * Attraction zone as a multiple of the element's half-size from center.
   * `1` engages at the edge; `2` reaches one half-size beyond the edge.
   * Wide and tall elements get elliptical zones that match their shape.
   */
  radius?: number;
  disabled?: boolean;
  /**
   * How far the content follows the cursor, as a fraction of half-width
   * (X) and half-height (Y). Higher pulls harder. Travel is aspect-aware:
   * wide elements move more left/right, tall ones more up/down.
   */
  pullFactor?: number;
  /** Max tilt in degrees. Set to 0 to disable tilting. */
  tiltStrength?: number;
  /** Show a light sheen that follows the cursor across the surface. */
  glare?: boolean;
  /** Scale applied while the magnet is engaged. */
  lift?: number;
  /** Spring stiffness while tracking the cursor, higher snaps faster. */
  stiffness?: number;
  /** Spring damping while tracking, lower is looser. */
  damping?: number;
  wrapperClassName?: string;
  innerClassName?: string;
}

// Soft radial falloff instead of a hard edge.
const smoothstep = (t: number) => {
  const c = Math.min(Math.max(t, 0), 1);
  return c * c * (3 - 2 * c);
};

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

// Loose spring used when the cursor lets go, so the element
// overshoots and wobbles back into place instead of easing home.
const RELEASE_STIFFNESS = 0.055;
const RELEASE_DAMPING = 0.9;

export default function Magnet({
  children,
  radius = 2,
  disabled = false,
  pullFactor = 0.45,
  tiltStrength = 12,
  glare = true,
  lift = 1.03,
  stiffness = 0.14,
  damping = 0.72,
  wrapperClassName = "",
  innerClassName = "",
  ...props
}: MagnetProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled) return;

    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    if (!wrapper || !inner) return;

    const coarse = window.matchMedia(
      "(max-width: 639px), (hover: none) and (pointer: coarse)"
    );
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (coarse.matches || reducedMotion.matches) return;

    // Spring state lives outside React, no re-render per mousemove.
    const current = { x: 0, y: 0, rx: 0, ry: 0, s: 1, g: 0 };
    const target = { x: 0, y: 0, rx: 0, ry: 0, s: 1, g: 0 };
    const velocity = { x: 0, y: 0, rx: 0, ry: 0, s: 0, g: 0 };
    const glarePos = { x: 50, y: 50 };
    let engaged = false;
    let frame = 0;
    let settled = true;

    const keys = ["x", "y", "rx", "ry", "s", "g"] as const;

    const tick = () => {
      const k = engaged ? stiffness : RELEASE_STIFFNESS;
      const d = engaged ? damping : RELEASE_DAMPING;

      let energy = 0;
      for (const key of keys) {
        velocity[key] = (velocity[key] + (target[key] - current[key]) * k) * d;
        current[key] += velocity[key];
        energy += Math.abs(velocity[key]) + Math.abs(target[key] - current[key]);
      }

      if (tiltStrength === 0) {
        // Flat 2D only: even rotateX(0)/rotateY(0) are 3D transform
        // functions and can promote a 3D layer that blanks backdrop-filter.
        inner.style.transform =
          `translate3d(${current.x}px, ${current.y}px, 0) scale(${current.s})`;
      } else {
        inner.style.transform =
          `translate3d(${current.x}px, ${current.y}px, 0) ` +
          `rotateX(${current.rx}deg) rotateY(${current.ry}deg) scale(${current.s})`;
      }

      const glareEl = glareRef.current;
      if (glareEl) {
        glareEl.style.opacity = String(clamp(current.g, 0, 1));
        glareEl.style.background = `radial-gradient(140% 140% at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.32), rgba(255,255,255,0.08) 55%, transparent 80%)`;
      }

      if (energy < 0.005) {
        settled = true;
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (settled) {
        settled = false;
        frame = requestAnimationFrame(tick);
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const { left, top, width, height } = wrapper.getBoundingClientRect();
      const halfW = Math.max(width / 2, 1);
      const halfH = Math.max(height / 2, 1);
      const centerX = left + halfW;
      const centerY = top + halfH;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;

      // Elliptical zone scaled from the element's own half-size, so a wide
      // card reaches farther left/right and a tall one farther up/down.
      const reachX = halfW * Math.max(radius, 0.01);
      const reachY = halfH * Math.max(radius, 0.01);
      const nx = dx / reachX;
      const ny = dy / reachY;
      const distance = Math.hypot(nx, ny);
      const pull = smoothstep(1 - distance);
      engaged = pull > 0.001;

      // Travel is also aspect-aware: fraction of half-width / half-height.
      target.x = nx * halfW * pullFactor * pull;
      target.y = ny * halfH * pullFactor * pull;
      // Tilt banks toward the cursor against the element itself.
      target.ry = clamp(dx / halfW, -1, 1) * tiltStrength * pull;
      target.rx = clamp(-dy / halfH, -1, 1) * tiltStrength * pull;
      target.s = 1 + (lift - 1) * pull;
      target.g = pull;

      glarePos.x = 50 + clamp(dx / halfW, -1, 1) * 50;
      glarePos.y = 50 + clamp(dy / halfH, -1, 1) * 50;

      wake();
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(frame);
      inner.style.transform = "";
      if (glareRef.current) glareRef.current.style.opacity = "0";
    };
  }, [radius, disabled, pullFactor, tiltStrength, lift, stiffness, damping]);

  // Perspective + preserve-3d only when tilting. A 3D rendering context on an
  // ancestor is a backdrop root, so descendants with backdrop-filter (e.g.
  // LiquidGlass) stop sampling the page and the effect goes blank. Flat 2D
  // pull (tiltStrength 0) stays safe for those callers.
  const use3d = tiltStrength !== 0;

  return (
    <div
      ref={wrapperRef}
      // No display class here: the div is block by default, and callers
      // (e.g. JellyButton) can pass inline-block without a class conflict.
      className={`relative ${wrapperClassName}`}
      style={use3d ? { perspective: "800px" } : undefined}
      {...props}
    >
      {/* Tip: give innerClassName the same border radius as your content
          (e.g. rounded-2xl) so the glare clips to the rounded corners. */}
      <div
        ref={innerRef}
        // h-full but NOT w-full: an explicit 100% width is circular against the
        // shrink-to-fit wrapper and collapses it; block width already fills.
        className={`relative h-full will-change-transform ${use3d ? "[transform-style:preserve-3d]" : ""} ${innerClassName}`}
      >
        {children}
        {glare && (
          <div
            ref={glareRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] opacity-0 mix-blend-overlay"
          />
        )}
      </div>
    </div>
  );
}
