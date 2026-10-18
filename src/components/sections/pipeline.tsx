import { Terminal } from "lucide-react";
import Marquee from "@/components/designpass/Marquee";
import Tally from "@/components/designpass/Tally";
import { LogoMark } from "@/components/ui/logo";
import { MicroLabel } from "@/components/ui/micro-label";
import { PillButton } from "@/components/ui/pill-button";

// Node diagram (after PlayerZero). Coordinates are in the SVG's 1000×320 viewBox.
const WIRES = [
  "M30 70 H350 C385 70 395 88 425 112",
  "M970 70 H650 C615 70 605 88 575 112",
  "M30 250 H350 C385 250 395 232 425 208",
  "M970 250 H650 C615 250 605 232 575 208",
];
const CHIPS = [
  { x: 150, y: 70, label: "Repo URL" },
  { x: 270, y: 70, label: "Tag" },
  { x: 150, y: 250, label: "Assets" },
  { x: 270, y: 250, label: "Digest" },
  { x: 730, y: 70, label: "Windows" },
  { x: 850, y: 70, label: "macOS" },
  { x: 730, y: 250, label: "x64" },
  { x: 850, y: 250, label: "arm64" },
];
const DOTS = [
  [30, 70],
  [350, 70],
  [970, 70],
  [650, 70],
  [30, 250],
  [350, 250],
  [970, 250],
  [650, 250],
];

const REPOS = [
  "cli/cli",
  "BurntSushi/ripgrep",
  "neovim/neovim",
  "sharkdp/bat",
  "sharkdp/fd",
  "jesseduffield/lazygit",
  "junegunn/fzf",
  "astral-sh/uv",
  "starship/starship",
  "eza-community/eza",
  "zellij-org/zellij",
  "helix-editor/helix",
];

function DotHeading({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      aria-hidden
      className={`text-center font-dots text-[clamp(44px,8vw,96px)] font-black uppercase leading-none tracking-[0.02em] ${className ?? ""}`}
    >
      {children}
    </p>
  );
}

export function Pipeline() {
  return (
    <section aria-labelledby="pipeline-heading" className="relative border-t border-rule bg-paper py-24 sm:py-32">
      <h2 id="pipeline-heading" className="sr-only">
        Paste a link, we match your machine, you download from GitHub
      </h2>
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <DotHeading>Paste. Match.</DotHeading>

        {/* Desktop diagram */}
        <div className="relative mx-auto mt-10 hidden aspect-[1000/320] max-w-5xl md:block">
          <svg viewBox="0 0 1000 320" className="absolute inset-0 size-full" aria-hidden>
            <g fill="none" stroke="var(--rule-strong)" strokeWidth="1">
              {WIRES.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
            <g fill="none" stroke="var(--ember)" strokeWidth="1.25" strokeDasharray="2 10" className="animate-dash">
              {WIRES.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
            {DOTS.map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="var(--ink)" />
            ))}
            {CHIPS.map(({ x, y, label }) => (
              <g key={label} transform={`translate(${x} ${y})`}>
                <rect x={-label.length * 4 - 14} y="-12" width={label.length * 8 + 28} height="24" rx="12" fill="var(--paper-raised)" stroke="var(--rule-strong)" />
                <text textAnchor="middle" dy="4" fontSize="11" fill="var(--ink)" style={{ fontFamily: "var(--font-mono)" }}>
                  {label}
                </text>
              </g>
            ))}
          </svg>
          <div className="absolute left-1/2 top-1/2 aspect-square w-[16%] -translate-x-1/2 -translate-y-1/2 rounded-[28%] border border-rule bg-paper-sunk shadow-tile">
            <div className="absolute inset-[12%] grid place-items-center rounded-[24%] bg-paper-raised shadow-tile">
              <LogoMark className="size-1/2" />
            </div>
          </div>
        </div>

        {/* Mobile diagram */}
        <div className="mt-10 flex flex-col items-center gap-5 md:hidden" aria-hidden>
          <div className="flex flex-wrap justify-center gap-2">
            {CHIPS.slice(0, 4).map((c) => (
              <span key={c.label} className="rounded-full border border-rule-strong bg-paper-raised px-3 py-1 font-mono text-[11px]">
                {c.label}
              </span>
            ))}
          </div>
          <span className="h-8 w-px bg-rule-strong" />
          <span className="grid size-24 place-items-center rounded-[28px] border border-rule bg-paper-sunk p-3 shadow-tile">
            <span className="grid size-full place-items-center rounded-[20px] bg-paper-raised shadow-tile">
              <LogoMark className="size-9" />
            </span>
          </span>
          <span className="h-8 w-px bg-rule-strong" />
          <div className="flex flex-wrap justify-center gap-2">
            {CHIPS.slice(4).map((c) => (
              <span key={c.label} className="rounded-full border border-rule-strong bg-paper-raised px-3 py-1 font-mono text-[11px]">
                {c.label}
              </span>
            ))}
          </div>
        </div>

        <DotHeading className="mt-10">Download.</DotHeading>

        <p className="mx-auto mt-8 max-w-md text-center text-[15px] leading-relaxed text-ink-muted">
          OneCLIQ reads only the owner, repo and tag from your link, then picks the one file built for your machine.
          Unclear names are never guessed.
        </p>

        {/* Stats strip */}
        <div className="mt-16 grid overflow-hidden rounded-[24px] border border-rule bg-paper-raised shadow-card md:grid-cols-3">
          {[
            { to: 3, label: "Operating systems: Windows, macOS, Linux" },
            { to: 3, label: "CPU architectures: x64, arm64, x86" },
          ].map(({ to, label }) => (
            <div key={label} className="flex min-h-48 flex-col justify-between gap-8 border-b border-rule p-7 md:border-b-0 md:border-r">
              <MicroLabel className="text-ink-subtle">Coverage</MicroLabel>
              <div>
                <Tally to={to} from={0} duration={1200} className="font-dots text-[64px] font-black leading-none" />
                <p className="mt-2 text-[14px] text-ink-muted">{label}</p>
              </div>
            </div>
          ))}
          <div className="flex min-h-48 flex-col justify-between gap-6 p-7">
            <p className="text-[15px] leading-relaxed text-ink">
              Zero things installed for you. The button links to the file on GitHub. Nothing is mirrored, run, or
              installed.
            </p>
            <PillButton href="#cli" tone="paper" icon={<Terminal aria-hidden className="size-4" />} className="self-start">
              Use it from a terminal
            </PillButton>
          </div>
        </div>
      </div>

      <div className="mt-20">
        <p className="mb-5 text-center">
          <MicroLabel className="text-ink-subtle">Works with any public repo that ships release files</MicroLabel>
        </p>
        <Marquee speed={40} gap={12} fade={120} onHover="slow" className="py-1.5">
          {REPOS.map((r) => (
            <span key={r} className="rounded-full border border-rule bg-paper-raised px-4 py-2 font-mono text-[13px] text-ink-muted">
              {r}
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
