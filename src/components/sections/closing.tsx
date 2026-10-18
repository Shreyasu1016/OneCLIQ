"use client";

import { ArrowUp } from "lucide-react";
import JellyButton from "@/components/designpass/JellyButton";
import SoftPatterns from "@/components/designpass/SoftPatterns";

/** Centered CTA on dotted paper (after micro's “Apply now” block). */
export function Closing() {
  return (
    <section aria-labelledby="closing-heading" className="relative isolate overflow-hidden py-28 sm:py-36">
      <SoftPatterns
        pattern="dots"
        backgroundColor="var(--paper)"
        color="var(--ink)"
        spacing={22}
        weight={1}
        patternOpacity={0.12}
        washOpacity={0}
        className="absolute! inset-0 -z-10"
      />
      <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
        <div className="mx-auto mb-16 h-px max-w-4xl bg-rule-strong" />
        <h2 id="closing-heading" className="text-balance font-serif text-[clamp(34px,4.6vw,56px)] leading-[1.05] tracking-[-0.01em]">
          Paste a link to get the <em>right</em> file
        </h2>
        <div className="mt-9">
          <JellyButton
            type="button"
            className="h-13 gap-2 px-7! text-[15px]!"
            onClick={() => {
              document.getElementById("find")?.scrollIntoView({ behavior: "smooth", block: "start" });
              setTimeout(() => document.querySelector<HTMLInputElement>("#find input[name=url]")?.focus({ preventScroll: true }), 500);
            }}
          >
            Find a download
            <ArrowUp aria-hidden className="size-4" />
          </JellyButton>
        </div>
      </div>
    </section>
  );
}
