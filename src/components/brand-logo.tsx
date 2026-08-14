import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function BrandLogo({ className, size = "md" }: BrandLogoProps) {
  const sizes = {
    sm: { mark: "size-7 text-[11px]", name: "text-base", sub: "text-[8px]" },
    md: { mark: "size-9 text-sm", name: "text-[22px]", sub: "text-[10px]" },
    lg: { mark: "size-14 text-xl", name: "text-4xl", sub: "text-xs" },
  };

  const s = sizes[size];

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex items-center justify-center bg-foreground text-background font-extrabold tracking-[0.5px] shrink-0",
          s.mark
        )}
      >
        D2
      </span>
      <span className="leading-none text-left">
        <span className={cn("block font-heading font-extrabold tracking-[0.5px]", s.name)}>
          DEUX
        </span>
        <span className={cn("block uppercase text-muted-foreground tracking-[0.2em]", s.sub)}>
          AI Factory&trade;
        </span>
      </span>
    </span>
  );
}
