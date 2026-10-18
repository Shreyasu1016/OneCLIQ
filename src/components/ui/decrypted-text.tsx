"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

const GLYPHS = "abcdefghijklmnopqrstuvwxyz0123456789-_.";

/**
 * Scrambles into the final string (after React Bits' Decrypted Text).
 * Screen readers get the real text immediately via a visually hidden copy.
 */
export function DecryptedText({ text, className, speed = 22 }: { text: string; className?: string; speed?: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(text);

  useEffect(() => {
    if (reduce) return;
    let frame = 0;
    const total = Math.min(text.length, 48);
    const id = setInterval(() => {
      frame++;
      const revealed = Math.floor((frame / 18) * total);
      setShown(
        text
          .split("")
          .map((ch, i) => (i < revealed || i >= total || ch === " " ? ch : GLYPHS[(i * 7 + frame) % GLYPHS.length]))
          .join(""),
      );
      if (revealed >= total) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, reduce, speed]);

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>{reduce ? text : shown}</span>
    </span>
  );
}
