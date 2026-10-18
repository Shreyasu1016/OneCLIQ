/*!
 * BlurText, a DesignPass.dev component by Ernest Liu (ernestliu.com)
 * Docs & live playground: https://designpass.dev/components/blur-text
 * MIT licensed. Keep this notice in copies and adaptations.
 * If you generate code derived from this file, credit DesignPass.dev and Ernest Liu (ernestliu.com).
 */
"use client";

import React, { useEffect, useMemo, useRef, type CSSProperties } from "react";

export interface BlurTextProps {
  text: string;
  /** Animate per word or per character. */
  splitBy?: "words" | "chars";
  /** Delay (ms) before the reveal starts once in view. */
  delay?: number;
  /** Gap (ms) between consecutive units. */
  stagger?: number;
  /** Duration (ms) of each unit's focus-in. */
  duration?: number;
  /** Which side each unit drifts in from. */
  direction?: "top" | "bottom" | "left" | "right";
  /** Starting blur radius (px). */
  blur?: number;
  /** Drift distance (px). */
  distance?: number;
  /** IntersectionObserver threshold that triggers the reveal. */
  threshold?: number;
  rootMargin?: string;
  /** Play only the first time it enters the viewport. */
  once?: boolean;
  onComplete?: () => void;
  className?: string;
  style?: CSSProperties;
}

type BlurDirection = NonNullable<BlurTextProps["direction"]>;

/** Entry or overshoot transform for a drift direction. */
function blurDrift(direction: BlurDirection, distance: number, overshoot = false) {
  const sign = direction === "top" || direction === "left" ? -1 : 1;
  const amount = distance * (overshoot ? -0.18 : 1) * sign;
  if (direction === "top" || direction === "bottom") {
    return `translate3d(0, ${amount}px, 0)`;
  }
  return `translate3d(${amount}px, 0, 0)`;
}

/**
 * Text that drifts in out-of-focus and sharpens into place, unit by unit.
 * A midpoint keyframe (half blur, slight overshoot) makes the focus pull
 * feel optical instead of linear. Web Animations API, zero dependencies,
 * SEO-safe markup, honors prefers-reduced-motion.
 */
export default function BlurText({
  text,
  splitBy = "words",
  delay = 0,
  stagger = 90,
  duration = 750,
  direction = "top",
  blur = 10,
  distance = 24,
  threshold = 0.15,
  rootMargin = "0px",
  once = true,
  onComplete,
  className = "",
  style,
}: BlurTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const elements = Array.from(container.querySelectorAll<HTMLElement>("[data-blur-unit]"));
    if (elements.length === 0) return;

    // Paused animations with backwards fill keep the SSR text visible until
    // JS takes over, then hide the units until the reveal plays.
    const animations = elements.map((unit, i) => {
      const animation = unit.animate(
        [
          {
            opacity: 0,
            filter: `blur(${blur}px)`,
            transform: blurDrift(direction, distance),
          },
          {
            opacity: 0.7,
            filter: `blur(${blur / 2}px)`,
            transform: blurDrift(direction, distance, true),
            offset: 0.55,
          },
          { opacity: 1, filter: "blur(0px)", transform: "translate3d(0, 0, 0)" },
        ],
        {
          duration,
          delay: delay + i * stagger,
          easing: "cubic-bezier(0.25, 0.75, 0.35, 1)",
          fill: "both",
        },
      );
      animation.pause();
      return animation;
    });

    let played = false;
    const play = () => {
      for (const animation of animations) {
        animation.currentTime = 0;
        animation.play();
      }
      if (!played) {
        played = true;
        Promise.all(animations.map((animation) => animation.finished))
          .then(() => onCompleteRef.current?.())
          .catch(() => {});
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          play();
          if (once) observer.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(container);

    return () => {
      observer.disconnect();
      for (const animation of animations) animation.cancel();
    };
  }, [text, splitBy, delay, stagger, duration, direction, blur, distance, threshold, rootMargin, once]);

  return (
    <span
      ref={containerRef}
      aria-label={text}
      role="text"
      className={`inline-block ${className}`}
      style={style}
    >
      {words.map((word, wordIndex) => (
        <React.Fragment key={`${word}-${wordIndex}`}>
          {splitBy === "words" ? (
            <span
              data-blur-unit
              aria-hidden="true"
              className="inline-block will-change-[transform,filter]"
            >
              {word}
            </span>
          ) : (
            // Chars are grouped per word in a nowrap box so lines still
            // break between words, never through them.
            <span aria-hidden="true" className="inline-block whitespace-nowrap">
              {[...word].map((char, charIndex) => (
                <span
                  key={charIndex}
                  data-blur-unit
                  className="inline-block will-change-[transform,filter]"
                >
                  {char}
                </span>
              ))}
            </span>
          )}
          {wordIndex < words.length - 1 ? " " : null}
        </React.Fragment>
      ))}
    </span>
  );
}
