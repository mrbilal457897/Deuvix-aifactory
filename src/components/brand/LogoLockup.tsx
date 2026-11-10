import { SiteLogo } from "@/components/brand/SiteLogo";
import { cn } from "@/lib/utils";

type LogoLockupProps = {
  /** Logo height in px; caption stays 9px (matches the navbar lockup). */
  height?: number;
  href?: string;
  intro?: boolean;
  className?: string;
};

/**
 * The full brand lockup used everywhere the logo appears:
 * the Deuvix wordmark with "AI Factory" stacked underneath,
 * exactly like the navbar.
 */
export function LogoLockup({ height = 20, href = "/", intro = false, className }: LogoLockupProps) {
  return (
    <span className={cn("inline-flex flex-col items-start leading-none", className)}>
      <SiteLogo intro={intro} height={height} href={href} className="logo-inline" />
      <span className="mt-1 text-[9px] text-muted-foreground uppercase tracking-[0.22em] font-medium leading-none">
        AI Factory
      </span>
    </span>
  );
}
