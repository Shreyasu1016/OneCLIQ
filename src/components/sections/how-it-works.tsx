import Noise from "@/components/designpass/Noise";
import { LogoMark } from "@/components/ui/logo";
import { MicroLabel } from "@/components/ui/micro-label";
import { cn } from "@/lib/cn";

// Flora-style graph. Everything is laid out in a 1200×1000 box so the SVG wires and
// the HTML cards (positioned in %) scale together.
const W = 1200;
const H = 1000;
const HUB_TOP = { x: 600, y: 400 };
const HUB_BOTTOM = { x: 600, y: 580 };

type Card = { x: number; y: number; w: number; h: number; file: string; art: string; match?: boolean };

// Files from a real-looking release; the matched one is lit.
const ASSETS: Card[] = [
  { x: 0, y: 120, w: 300, h: 110, file: "bat-v0.25.0-x86_64-pc-windows-msvc.zip", art: "a" },
  { x: 360, y: 160, w: 230, h: 110, file: "bat_0.25.0_amd64.deb", art: "b" },
  { x: 700, y: 30, w: 190, h: 110, file: "Source code (zip)", art: "c" },
  { x: 720, y: 200, w: 340, h: 110, file: "bat-v0.25.0-aarch64-apple-darwin.tar.gz", art: "d", match: true },
];

const STEPS: Card[] = [
  { x: 80, y: 700, w: 340, h: 150, file: "Paste a link", art: "e" },
  { x: 460, y: 840, w: 300, h: 150, file: "We match your machine", art: "f" },
  { x: 830, y: 700, w: 340, h: 150, file: "Download from GitHub", art: "g" },
];

const STEP_BODY: Record<string, string> = {
  "Paste a link": "Any public github.com repository or release URL. We read only the owner, repo and tag.",
  "We match your machine": "Latest stable release, then the file built for your OS and CPU.",
  "Download from GitHub": "The button links straight to the file. Nothing is mirrored or installed.",
};

// Painterly gradient “thumbnails” standing in for Flora's image cards.
const ART: Record<string, string> = {
  a: "radial-gradient(120% 90% at 10% 20%, #4d6a63 0%, transparent 60%), radial-gradient(80% 80% at 90% 90%, #1e2a2a, transparent), #29312f",
  b: "radial-gradient(90% 90% at 30% 30%, #6c87a0 0%, transparent 70%), radial-gradient(80% 80% at 80% 80%, #23324a, transparent), #1c2533",
  c: "radial-gradient(100% 100% at 70% 20%, #7a4b2f 0%, transparent 70%), #1a1310",
  d: "radial-gradient(70% 90% at 20% 30%, #e5582b 0%, transparent 70%), radial-gradient(70% 90% at 90% 70%, #5b4bdb 0%, transparent 70%), #2a1626",
  e: "radial-gradient(90% 80% at 20% 10%, #8aa7c4 0%, transparent 65%), radial-gradient(70% 70% at 90% 100%, #3a4b6b, transparent), #1b2230",
  f: "radial-gradient(90% 90% at 80% 20%, #b3876b 0%, transparent 65%), radial-gradient(70% 70% at 10% 90%, #5a3b52, transparent), #22181d",
  g: "radial-gradient(90% 90% at 30% 70%, #6f9a67 0%, transparent 65%), radial-gradient(70% 70% at 90% 10%, #c7c08a, transparent), #1a2219",
};

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

function wireFromTop(c: Card) {
  const sx = c.x + c.w / 2;
  const sy = c.y + c.h;
  return `M${sx} ${sy} C ${sx} ${sy + 110}, ${HUB_TOP.x} ${HUB_TOP.y - 150}, ${HUB_TOP.x} ${HUB_TOP.y}`;
}
function wireToBottom(c: Card) {
  const ex = c.x + c.w / 2;
  const ey = c.y;
  return `M${HUB_BOTTOM.x} ${HUB_BOTTOM.y} C ${HUB_BOTTOM.x} ${HUB_BOTTOM.y + 150}, ${ex} ${ey - 120}, ${ex} ${ey}`;
}

function Tile({ card, children, className }: { card: Card; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("absolute overflow-hidden rounded-[22px] border border-night-rule", className)}
      style={{ left: pct(card.x, W), top: pct(card.y, H), width: pct(card.w, W), height: pct(card.h, H), background: ART[card.art] }}
    >
      <Noise preset="fine" opacity={0.35} />
      <div className="relative flex size-full flex-col justify-end p-4">{children}</div>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section
      id="how"
      aria-labelledby="how-heading"
      className="relative isolate scroll-mt-8 overflow-hidden bg-night py-20 text-night-ink sm:py-28"
    >
      <div aria-hidden className="bg-dots-night absolute inset-0 -z-10 opacity-70" />

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex items-start justify-between text-[15px] leading-tight">
          <p>
            <span className="text-night-muted">How it</span>
            <br />
            <span className="font-medium">works</span>
          </p>
          <p className="text-right">
            <span className="text-night-muted">Steps</span>
            <br />
            <span className="font-medium">03</span>
          </p>
        </div>

        <h2 id="how-heading" className="sr-only">
          How it works
        </h2>

        {/* Desktop graph */}
        <div className="relative mt-6 hidden aspect-[1200/1000] lg:block">
          <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden>
            <g fill="none" stroke="var(--night-rule)" strokeWidth="1.5">
              {ASSETS.filter((a) => !a.match).map((a) => (
                <path key={a.file} d={wireFromTop(a)} />
              ))}
              {STEPS.map((s) => (
                <path key={s.file} d={wireToBottom(s)} stroke="rgb(255 255 255 / 0.28)" />
              ))}
            </g>
            {ASSETS.filter((a) => a.match).map((a) => (
              <g key={a.file}>
                <path d={wireFromTop(a)} fill="none" stroke="var(--ember)" strokeWidth="1.5" />
                <path d={wireFromTop(a)} fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="2 12" className="animate-dash" />
              </g>
            ))}
          </svg>

          {ASSETS.map((a) => (
            <Tile key={a.file} card={a} className={a.match ? "ring-1 ring-ember" : "opacity-70"}>
              <p className="font-mono text-[12px] leading-snug text-white/90">{a.file}</p>
              {a.match && <MicroLabel className="mt-1 text-[10px] text-ember">Matched · macOS arm64</MicroLabel>}
            </Tile>
          ))}

          <div className="absolute flex items-center justify-center gap-4" style={{ left: 0, right: 0, top: pct(430, H), height: pct(120, H) }}>
            <LogoMark inverted className="size-20" />
            <span className="font-serif text-[96px] italic leading-none tracking-[-0.02em]">One</span>
            <span className="font-dots text-[88px] font-black uppercase leading-none">cliq</span>
          </div>

          <ol>
            {STEPS.map((s, i) => (
              <li key={s.file}>
                <Tile card={s}>
                  <span className="absolute right-4 top-3 font-dots text-[28px] font-black text-white/60">0{i + 1}</span>
                  <h3 className="text-[17px] font-medium">{s.file}</h3>
                  <p className="mt-1 text-[13px] leading-snug text-white/75">{STEP_BODY[s.file]}</p>
                </Tile>
              </li>
            ))}
          </ol>
        </div>

        {/* Stacked layout for smaller screens */}
        <div className="mt-10 lg:hidden">
          <div className="flex items-center justify-center gap-3">
            <LogoMark inverted className="size-12" />
            <span className="font-serif text-6xl italic leading-none">One</span>
            <span className="font-dots text-5xl font-black uppercase leading-none">cliq</span>
          </div>
          <ol className="relative mt-10 space-y-4 before:absolute before:bottom-6 before:left-6 before:top-6 before:w-px before:bg-night-rule">
            {STEPS.map((s, i) => (
              <li key={s.file} className="relative overflow-hidden rounded-[22px] border border-night-rule p-5 pl-16" style={{ background: ART[s.art] }}>
                <span className="absolute left-3 top-5 grid size-7 place-items-center rounded-full bg-night-ink font-mono text-[11px] text-night">
                  {i + 1}
                </span>
                <h3 className="text-[17px] font-medium">{s.file}</h3>
                <p className="mt-1 text-[14px] leading-snug text-white/75">{STEP_BODY[s.file]}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
