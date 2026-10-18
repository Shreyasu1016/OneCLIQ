/*!
 * Tally, a DesignPass.dev component by Ernest Liu (ernestliu.com)
 * Docs & live playground: https://designpass.dev/components/tally
 * MIT licensed. Keep this notice in copies and adaptations.
 * If you generate code derived from this file, credit DesignPass.dev and Ernest Liu (ernestliu.com).
 */
"use client";

import React, { useEffect, useRef, type CSSProperties } from "react";

export interface TallyProps {
  /** Target value the counter settles on. */
  to: number;
  /** Starting value. */
  from?: number;
  /** Count direction. "down" starts at `to` and lands on `from`. */
  direction?: "up" | "down";
  /** Ms before the count begins once in view. */
  delay?: number;
  /** Ms for the full count. */
  duration?: number;
  /** Spring stiffness; higher snaps harder to the target. */
  stiffness?: number;
  /** Spring damping; higher settles with less overshoot. */
  damping?: number;
  /** Fixed fraction digits. Defaults to the richer of `from`/`to`. */
  decimals?: number;
  /** Thousands grouping separator. Empty string disables grouping. */
  separator?: string;
  /** String rendered before the number. */
  prefix?: string;
  /** String rendered after the number. */
  suffix?: string;
  /** Locale passed to Intl.NumberFormat. */
  locale?: string;
  /** IntersectionObserver threshold that arms the count. */
  threshold?: number;
  rootMargin?: string;
  /** Play only the first time it enters the viewport. */
  once?: boolean;
  /** Replay the count when the pointer enters. */
  triggerOnHover?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  className?: string;
  style?: CSSProperties;
}

function decimalPlaces(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const text = String(value);
  if (!text.includes(".")) return 0;
  return text.split(".")[1]?.replace(/0+$/, "").length ?? 0;
}

/**
 * A number that counts into view on a spring, formatted with locale-aware
 * grouping, decimals, and optional prefix or suffix. Replays on hover. Zero
 * dependencies; honors prefers-reduced-motion.
 */
export default function Tally({
  to,
  from = 0,
  direction = "up",
  delay = 0,
  duration = 1600,
  stiffness = 120,
  damping = 18,
  decimals,
  separator = ",",
  prefix = "",
  suffix = "",
  locale = "en-US",
  threshold = 0.25,
  rootMargin = "0px",
  once = true,
  triggerOnHover = false,
  onStart,
  onEnd,
  className = "",
  style,
}: TallyProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const onStartRef = useRef(onStart);
  const onEndRef = useRef(onEnd);
  onStartRef.current = onStart;
  onEndRef.current = onEnd;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const startValue = direction === "down" ? to : from;
    const endValue = direction === "down" ? from : to;
    const places = decimals ?? Math.max(decimalPlaces(from), decimalPlaces(to));

    const formatter = new Intl.NumberFormat(locale, {
      useGrouping: Boolean(separator),
      minimumFractionDigits: places,
      maximumFractionDigits: places,
    });

    const format = (value: number) => {
      let body = formatter.format(value);
      if (separator && separator !== ",") body = body.replace(/,/g, separator);
      return `${prefix}${body}${suffix}`;
    };

    el.textContent = format(startValue);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      el.textContent = format(endValue);
      return;
    }

    // Map duration onto spring feel: longer durations soften the snap.
    const k = stiffness * (1000 / Math.max(duration, 1));
    const c = damping * (1 + 800 / Math.max(duration, 1));

    let frame = 0;
    let running = false;
    let value = startValue;
    let velocity = 0;
    let last = 0;
    let delayUntil = 0;
    let started = false;

    const stop = () => {
      running = false;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    const tick = (now: number) => {
      if (!running) return;
      if (now < delayUntil) {
        frame = requestAnimationFrame(tick);
        return;
      }
      if (!started) {
        started = true;
        onStartRef.current?.();
        last = now;
      }

      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;

      const force = (endValue - value) * k - velocity * c;
      velocity += force * dt;
      value += velocity * dt;

      const settled =
        Math.abs(endValue - value) < (places > 0 ? 10 ** -(places + 1) : 0.5) &&
        Math.abs(velocity) < 0.05;

      if (settled) {
        value = endValue;
        el.textContent = format(value);
        stop();
        onEndRef.current?.();
        return;
      }

      el.textContent = format(value);
      frame = requestAnimationFrame(tick);
    };

    const play = () => {
      stop();
      value = startValue;
      velocity = 0;
      started = false;
      el.textContent = format(startValue);
      delayUntil = performance.now() + delay;
      running = true;
      frame = requestAnimationFrame(tick);
    };

    let armed = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!armed || !once) play();
          armed = true;
          if (once) io.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    io.observe(el);

    const onEnter = () => play();
    if (triggerOnHover) el.addEventListener("pointerenter", onEnter);

    return () => {
      stop();
      io.disconnect();
      el.removeEventListener("pointerenter", onEnter);
    };
  }, [
    to,
    from,
    direction,
    delay,
    duration,
    stiffness,
    damping,
    decimals,
    separator,
    prefix,
    suffix,
    locale,
    threshold,
    rootMargin,
    once,
    triggerOnHover,
  ]);

  return (
    <span
      ref={ref}
      className={`inline-block tabular-nums ${className}`}
      style={style}
    />
  );
}
