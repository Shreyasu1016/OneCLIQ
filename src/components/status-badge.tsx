import { Check, Loader2, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/cn";

export type BadgeState = "recommended" | "not-recommended" | "downloading";

const STYLES: Record<BadgeState, { label: string; className: string; Icon: typeof Check }> = {
  recommended: {
    label: "Recommended",
    className: "border-moss/25 bg-moss/10 text-moss",
    Icon: Check,
  },
  "not-recommended": {
    label: "Not recommended — don’t install",
    className: "border-clay/25 bg-clay/10 text-clay",
    Icon: OctagonAlert,
  },
  downloading: {
    label: "Downloading",
    className: "border-dusk/25 bg-dusk/10 text-dusk",
    Icon: Loader2,
  },
};

export function StatusBadge({ state, className }: { state: BadgeState; className?: string }) {
  const { label, className: tone, Icon } = STYLES[state];
  return (
    <span
      data-testid="status-badge"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium",
        tone,
        className,
      )}
    >
      <Icon aria-hidden className={cn("size-3.5", state === "downloading" && "animate-spin")} strokeWidth={2.5} />
      {label}
    </span>
  );
}
