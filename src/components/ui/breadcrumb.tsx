import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** Container classes matching the surrounding page content. */
  className?: string;
}

/**
 * Site-wide breadcrumb. Renders an accessible trail (Home > … > current).
 * Intermediate items are links; the final item is marked `aria-current`.
 */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  if (!items?.length) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("text-left", className)}>
      <ol className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-5 text-muted-foreground sm:text-sm">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {index > 0 && (
                <ChevronRight className="size-3 shrink-0 text-muted-foreground/60" aria-hidden="true" />
              )}
              {isCurrent ? (
                <span
                  aria-current="page"
                  className="min-w-0 max-w-[70vw] truncate font-medium text-foreground/90 sm:max-w-none"
                >
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className="flex min-w-0 items-center gap-1 whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
                >
                  {index === 0 && <Home className="size-3 shrink-0" aria-hidden="true" />}
                  {item.label}
                </Link>
              ) : (
                <span className="min-w-0 truncate text-muted-foreground">{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
