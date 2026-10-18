import { cn } from "@/lib/cn";

type Tone = "ink" | "paper" | "night";

const TONES: Record<Tone, string> = {
  ink: "bg-ink text-paper hover:bg-ink/90",
  paper: "border border-rule bg-paper-raised text-ink hover:border-rule-strong",
  night: "bg-night-ink text-night hover:bg-white",
};

/** Pill link with an optional ember icon chip on the left (after PlayerZero's “Request a Demo”). */
export function PillButton({
  href,
  children,
  icon,
  tone = "ink",
  className,
  ...rest
}: {
  href: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  tone?: Tone;
  className?: string;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "children" | "className">) {
  return (
    <a
      href={href}
      className={cn(
        "group inline-flex h-11 items-center gap-2.5 rounded-full text-[14px] font-medium transition-colors",
        icon ? "py-1 pl-1 pr-5" : "px-5",
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {icon && (
        <span className="grid size-9 place-items-center rounded-full bg-ember text-white transition-transform group-hover:rotate-[-8deg]">
          {icon}
        </span>
      )}
      {children}
    </a>
  );
}
