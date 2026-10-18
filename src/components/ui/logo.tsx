import { cn } from "@/lib/cn";

/** OneCLIQ mark: an ink tile with a “click” ring, a down arrow and an ember dot. */
export function LogoMark({ className, inverted }: { className?: string; inverted?: boolean }) {
  const tile = inverted ? "var(--night-ink)" : "var(--ink)";
  const line = inverted ? "var(--night)" : "var(--paper)";
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill={tile} />
      <circle cx="16" cy="15" r="8.5" fill="none" stroke={line} strokeWidth="2.4" />
      <path
        d="M16 10.5v8m0 0-3.2-3.2M16 18.5l3.2-3.2"
        stroke={line}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="24.5" cy="24.5" r="2.6" fill="var(--ember)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-7" />
      <span className="text-[17px] font-medium tracking-tight">
        One<span className="font-serif text-[1.15em] italic tracking-normal">cliq</span>
      </span>
    </span>
  );
}
