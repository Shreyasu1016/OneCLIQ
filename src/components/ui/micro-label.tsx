import { cn } from "@/lib/cn";

/** Uppercase mono caption (DESIGN.md → Type → micro labels). */
export function MicroLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("font-mono text-[11px] uppercase tracking-[0.14em]", className)}>{children}</span>
  );
}
