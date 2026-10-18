/** Terminal presentation helpers: colour, gradient banner, cards, tables. */
import pc from "picocolors";

export const isTTY = !!process.stdout.isTTY;
const truecolor = pc.isColorSupported && /truecolor|24bit/i.test(process.env.COLORTERM ?? "");

type Rgb = [number, number, number];
const STOPS: Rgb[] = [
  [34, 211, 238], // cyan
  [139, 92, 246], // violet
  [230, 73, 199], // fuchsia
];

function lerp(a: Rgb, b: Rgb, t: number): Rgb {
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as Rgb;
}

/** Horizontal cyan → violet → fuchsia gradient (falls back to plain magenta). */
export function gradient(text: string): string {
  if (!pc.isColorSupported) return text;
  if (!truecolor) return pc.magenta(text);
  const chars = [...text];
  const n = Math.max(chars.length - 1, 1);
  return chars
    .map((ch, i) => {
      const t = i / n;
      const [r, g, b] = t < 0.5 ? lerp(STOPS[0], STOPS[1], t * 2) : lerp(STOPS[1], STOPS[2], (t - 0.5) * 2);
      return ch === " " ? ch : `\x1b[38;2;${r};${g};${b}m${ch}\x1b[39m`;
    })
    .join("");
}

export const c = {
  ok: (s: string) => pc.green(s),
  warn: (s: string) => pc.yellow(s),
  bad: (s: string) => pc.red(s),
  info: (s: string) => pc.cyan(s),
  accent: (s: string) => pc.magenta(s),
  dim: (s: string) => pc.dim(s),
  bold: (s: string) => pc.bold(s),
  mono: (s: string) => pc.white(s),
};

const ANSI = /\x1b\[[0-9;]*m/g;
export const visibleLength = (s: string) => [...s.replace(ANSI, "")].length;
const pad = (s: string, w: number) => s + " ".repeat(Math.max(0, w - visibleLength(s)));

export function banner(version: string): string {
  const art = [
    "  ┌─┐ ┌─┐ ┌─┐ ┬ ┌┬┐",
    "  │ │ │ │ │ ┬ │  │ ",
    "  └─┘ └─┼ └─┘ ┴  ┴ ",
  ];
  return [
    "",
    ...art.map((l) => gradient(l)),
    `  ${c.dim(`GitHub release resolver · v${version}`)}`,
    "",
  ].join("\n");
}

export type Tone = "ok" | "bad" | "info" | "warn";

/** Rounded card with a coloured left rule, used for result summaries. */
export function card(lines: string[], tone: Tone = "info", title?: string, opts: { rail?: boolean } = {}): string {
  const color = tone === "ok" ? pc.green : tone === "bad" ? pc.red : tone === "warn" ? pc.yellow : pc.cyan;
  const cols = Math.min(process.stdout.columns || 80, 92) - (opts.rail ? 3 : 0);
  const inner = Math.min(Math.max(...lines.map(visibleLength), title ? visibleLength(title) + 2 : 0, 36), cols - 8);
  const top = title
    ? color(`╭─ `) + c.bold(title) + color(` ${"─".repeat(Math.max(0, inner - visibleLength(title) - 1))}╮`)
    : color(`╭${"─".repeat(inner + 2)}╮`);
  const body = lines.map((l) => {
    const clipped = visibleLength(l) > inner ? truncate(l, inner) : l;
    return `${color("│")} ${pad(clipped, inner)} ${color("│")}`;
  });
  const out = [top, ...body, color(`╰${"─".repeat(inner + 2)}╯`)];
  // Sit inside @clack/prompts' left rail so the flow reads as one column.
  return (opts.rail ? out.map((l) => `${pc.gray("│")}  ${l}`) : out).join("\n");
}

function truncate(s: string, w: number): string {
  const plain = s.replace(ANSI, "");
  return plain.length > w ? plain.slice(0, w - 1) + "…" : plain;
}

/** Simple aligned table. First row is the header. */
export function table(rows: string[][], opts: { indent?: number } = {}): string {
  const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => visibleLength(r[i] ?? ""))));
  const indent = " ".repeat(opts.indent ?? 2);
  return rows
    .map((r, ri) => {
      const line = r.map((cell, i) => (i === r.length - 1 ? cell : pad(cell, widths[i]))).join("   ");
      return indent + (ri === 0 ? c.dim(line.replace(ANSI, "")) : line);
    })
    .join("\n");
}

export function kv(pairs: Array<[string, string]>): string[] {
  const w = Math.max(...pairs.map(([k]) => k.length));
  return pairs.map(([k, v]) => `${c.dim(k.padEnd(w))}  ${v}`);
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "unknown date";
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms)) return "unknown date";
  const day = 86_400_000;
  if (ms < day) return "today";
  if (ms < 2 * day) return "yesterday";
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"} ago`;
  if (ms < 30 * day) return plural(Math.floor(ms / day), "day");
  if (ms < 365 * day) return plural(Math.floor(ms / (30 * day)), "month");
  return plural(Math.floor(ms / (365 * day)), "year");
}
