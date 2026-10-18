import { Apple, ArrowRight, Cpu, Grid2x2, Package, Terminal } from "lucide-react";
import BlurText from "@/components/designpass/BlurText";
import SoftPatterns from "@/components/designpass/SoftPatterns";
import { Resolver } from "@/components/resolver";
import { GithubIcon } from "@/components/ui/github-icon";
import { Landscape } from "@/components/ui/landscape";
import { cn } from "@/lib/cn";

// Floating tiles on the arc (after Harmoniq). Positions are % of the arc box.
const TILES = [
  { Icon: Grid2x2, label: "Windows", x: 6, y: 62, r: "-10deg", delay: "0s", mobile: false },
  { Icon: Apple, label: "macOS", x: 18, y: 22, r: "-6deg", delay: "-2s", mobile: true },
  { Icon: GithubIcon, label: "GitHub", x: 44, y: 2, r: "4deg", delay: "-4s", mobile: true },
  { Icon: Terminal, label: "Linux", x: 70, y: 14, r: "8deg", delay: "-1s", mobile: true },
  { Icon: Cpu, label: "arm64", x: 86, y: 52, r: "10deg", delay: "-3s", mobile: false },
  { Icon: Package, label: "Release", x: 94, y: 82, r: "-4deg", delay: "-5s", mobile: false },
];

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden pb-[clamp(220px,32vw,420px)]">
      <SoftPatterns
        pattern="dots"
        backgroundColor="var(--paper)"
        color="var(--ink)"
        spacing={24}
        weight={1.1}
        patternOpacity={0.09}
        washOpacity={0}
        className="absolute! inset-0 -z-20 [mask-image:linear-gradient(to_bottom,black_40%,transparent_85%)]"
      />

      {/* The soft “sky dome” behind the headline. */}
      <div
        aria-hidden
        className="absolute left-1/2 top-[90px] -z-10 aspect-square w-[min(1100px,150vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--sky)_70%,white)_0%,color-mix(in_oklab,var(--sky)_35%,transparent)_60%,transparent_100%)]"
      />

      <div className="relative mx-auto max-w-5xl px-5 pt-14 sm:px-8 sm:pt-20">
        <div aria-hidden className="pointer-events-none absolute inset-x-5 top-6 h-[260px] sm:inset-x-8 sm:h-[300px]">
          {TILES.map(({ Icon, label, x, y, r, delay, mobile }) => (
            <span
              key={label}
              title={label}
              style={{ left: `${x}%`, top: `${y}%`, "--r": r, animationDelay: delay } as React.CSSProperties}
              className={cn(
                "absolute grid size-11 -translate-x-1/2 animate-bob place-items-center rounded-[14px] border border-rule bg-paper-raised text-ink shadow-tile sm:size-14 sm:rounded-[18px]",
                !mobile && "hidden sm:grid",
              )}
            >
              <Icon className="size-5 sm:size-6" />
            </span>
          ))}
        </div>

        <div className="relative flex flex-col items-center pt-24 text-center sm:pt-28">
          <a
            href="#cli"
            className="inline-flex items-center gap-2 rounded-full border border-rule bg-paper-raised/80 py-1 pl-1 pr-3 text-[13px] text-ink-muted shadow-tile backdrop-blur transition-colors hover:text-ink"
          >
            <span className="rounded-full bg-ink px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-paper">
              New
            </span>
            The <code className="font-mono text-ink">oqgit</code> CLI is here
            <ArrowRight aria-hidden className="size-3.5" />
          </a>

          <h1 className="mt-6 max-w-4xl text-balance font-serif text-[clamp(46px,7.4vw,96px)] font-normal leading-[0.98] tracking-[-0.02em]">
            <span className="sr-only">The right download from any GitHub release</span>
            <span aria-hidden>
              <BlurText text="The" stagger={70} />{" "}
              <em className="italic">
                <BlurText text="right" delay={70} />
              </em>{" "}
              <BlurText text="download" delay={140} />
              <br className="hidden sm:block" />{" "}
              <BlurText text="from any GitHub release" delay={210} stagger={70} />
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-pretty text-[17px] leading-relaxed text-ink-muted">
            Paste a repository or release link. We find the latest stable release and the file built for your
            operating system and CPU, then hand you the link straight from GitHub.
          </p>
        </div>

        <div id="find" className="relative mx-auto mt-10 max-w-2xl scroll-mt-24">
          <Resolver />
        </div>
      </div>

      <Landscape
        variant="hero"
        priority
        className="top-auto h-[clamp(260px,36vw,520px)] [mask-image:linear-gradient(to_bottom,transparent,black_30%)]"
      />
    </section>
  );
}
