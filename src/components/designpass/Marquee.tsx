/*!
 * Marquee, a DesignPass.dev component by Ernest Liu (ernestliu.com)
 * Docs & live playground: https://designpass.dev/components/marquee
 * MIT licensed. Keep this notice in copies and adaptations.
 * If you generate code derived from this file, credit DesignPass.dev and Ernest Liu (ernestliu.com).
 */
"use client";

import React, {
  Children,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

export type MarqueeDirection = "left" | "right" | "up" | "down";

export interface MarqueeProps {
  /** Items to scroll. Pass any React nodes (logos, chips, tweets, text). */
  children: ReactNode;
  /** Cruise speed in pixels per second. */
  speed?: number;
  /**
   * Travel direction while idle. Horizontal: left / right. Vertical: up /
   * down. Vertical marquees need a bounded height on the root (via className
   * or style) so the viewport can clip the track.
   */
  direction?: MarqueeDirection;
  /** Gap between consecutive items (px). */
  gap?: number;
  /** Soft fade width at each edge (px). Set 0 to disable. */
  fade?: number;
  /**
   * Cross-axis alignment of items in the track. Use `start` for variable-height
   * cards (tweets) so shorter ones sit flush to the top. Default `center`.
   */
  align?: "start" | "center" | "end";
  /**
   * What the strip does while hovered. Rate eases toward the target, never
   * snaps. Default slows the scroll so readers can catch an item.
   */
  onHover?: "none" | "pause" | "slow" | "fast";
  /** Class applied to each item wrapper around a child. */
  itemClassName?: string;
  className?: string;
  style?: CSSProperties;
}

const HOVER_RATE: Record<NonNullable<MarqueeProps["onHover"]>, number> = {
  none: 1,
  pause: 0,
  slow: 0.35,
  fast: 2.5,
};

const RATE_EASE = 0.12;

function isVertical(direction: MarqueeDirection): boolean {
  return direction === "up" || direction === "down";
}

/** Positive sign moves content toward increasing axis (right / down). */
function directionSign(direction: MarqueeDirection): 1 | -1 {
  return direction === "right" || direction === "down" ? 1 : -1;
}

/**
 * Infinite marquee for any children: logos, chips, tweets, or plain text.
 * Horizontal or vertical. Soft fades on both edges; hover eases speed toward
 * pause, slow, or fast. Duplicates its track for a seamless loop. Zero
 * dependencies; honors prefers-reduced-motion.
 *
 * Multi-row / multi-column walls are composition: stack several Marquee
 * instances (often with alternating directions and split children), not a
 * rows prop on this atom.
 */
export default function Marquee({
  children,
  speed = 40,
  direction = "left",
  gap = 28,
  fade = 72,
  align = "center",
  onHover = "slow",
  itemClassName = "",
  className = "",
  style,
}: MarqueeProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  const offsetRef = useRef(0);
  const rateRef = useRef(1);
  const rateTargetRef = useRef(1);
  const dirSignRef = useRef(directionSign(direction));
  const periodRef = useRef(0);
  const visibleRef = useRef(true);
  const frameRef = useRef(0);
  const vertical = isVertical(direction);

  const [copies, setCopies] = useState(2);

  const items = useMemo(() => {
    return Children.toArray(children).filter((child) => {
      if (typeof child === "string") return child.trim().length > 0;
      return child != null;
    });
  }, [children]);

  useEffect(() => {
    dirSignRef.current = directionSign(direction);
  }, [direction]);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const group = groupRef.current;
    if (!root || !track || !group || items.length === 0) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;
    let last = performance.now();

    const measure = () => {
      const period = vertical ? group.scrollHeight : group.scrollWidth;
      periodRef.current = period;
      if (period <= 0) return;

      const viewport = Math.max(1, vertical ? root.clientHeight : root.clientWidth);
      const needed = Math.max(2, Math.ceil(viewport / period) + 1);
      setCopies((prev) => (prev === needed ? prev : needed));
    };

    const paint = () => {
      const period = periodRef.current;
      if (period <= 0) return;
      let offset = offsetRef.current;
      if (dirSignRef.current < 0) {
        // Toward negative axis (left / up): offset stays in (-period, 0].
        while (offset <= -period) offset += period;
        while (offset > 0) offset -= period;
      } else {
        // Toward positive axis (right / down): keep a full duplicate parked
        // on the leading edge so the viewport never opens into empty space.
        while (offset >= 0) offset -= period;
        while (offset < -period) offset += period;
      }
      offsetRef.current = offset;
      track.style.transform = vertical
        ? `translate3d(0, ${offset}px, 0)`
        : `translate3d(${offset}px, 0, 0)`;
    };

    const tick = (now: number) => {
      if (disposed) return;
      const dt = Math.min(48, now - last) / 1000;
      last = now;

      rateRef.current += (rateTargetRef.current - rateRef.current) * RATE_EASE;

      if (!reduced && visibleRef.current && Math.abs(rateRef.current) > 0.001) {
        offsetRef.current += dirSignRef.current * speed * rateRef.current * dt;
        paint();
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    const onEnter = () => {
      rateTargetRef.current = HOVER_RATE[onHover];
    };
    const onLeave = () => {
      rateTargetRef.current = 1;
    };

    measure();
    paint();

    const ro = new ResizeObserver(() => {
      measure();
      paint();
    });
    ro.observe(root);
    ro.observe(group);

    const io = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
      },
      { threshold: 0 },
    );
    io.observe(root);

    root.addEventListener("pointerenter", onEnter);
    root.addEventListener("pointerleave", onLeave);

    if (!reduced) {
      frameRef.current = requestAnimationFrame(tick);
    } else {
      // Reduced motion: park at the start so content stays readable.
      offsetRef.current = 0;
      paint();
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
      io.disconnect();
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, [items, speed, direction, gap, onHover, copies, vertical]);

  const fadeMask =
    fade > 0
      ? vertical
        ? {
            maskImage: `linear-gradient(to bottom, transparent 0, #000 ${fade}px, #000 calc(100% - ${fade}px), transparent 100%)`,
            WebkitMaskImage: `linear-gradient(to bottom, transparent 0, #000 ${fade}px, #000 calc(100% - ${fade}px), transparent 100%)`,
          }
        : {
            maskImage: `linear-gradient(to right, transparent 0, #000 ${fade}px, #000 calc(100% - ${fade}px), transparent 100%)`,
            WebkitMaskImage: `linear-gradient(to right, transparent 0, #000 ${fade}px, #000 calc(100% - ${fade}px), transparent 100%)`,
          }
      : undefined;

  const alignClass =
    align === "start" ? "items-start" : align === "end" ? "items-end" : "items-center";

  const renderGroup = (key: string, primary: boolean, hidden: boolean) => (
    <div
      key={key}
      ref={primary ? groupRef : undefined}
      aria-hidden={hidden || undefined}
      className={`flex shrink-0 ${alignClass} ${vertical ? "flex-col" : "flex-row"}`}
      style={vertical ? { gap, paddingBottom: gap } : { gap, paddingRight: gap }}
    >
      {items.map((child, index) => (
        <div
          key={isValidElement(child) && child.key != null ? String(child.key) : index}
          className={`shrink-0 ${itemClassName}`.trim()}
        >
          {child}
        </div>
      ))}
    </div>
  );

  if (items.length === 0) return null;

  return (
    <div
      ref={rootRef}
      className={`relative overflow-hidden ${vertical ? "h-full" : "w-full"} ${className}`.trim()}
      style={{ ...fadeMask, ...style }}
    >
      <div
        ref={trackRef}
        className={`flex will-change-transform ${
          vertical ? "h-max flex-col" : "w-max flex-row"
        }`}
      >
        {Array.from({ length: copies }, (_, i) =>
          renderGroup(`group-${i}`, i === 0, i > 0),
        )}
      </div>
    </div>
  );
}
