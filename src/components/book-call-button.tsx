"use client";

import { CalendarDays, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBookCall } from "@/components/book-call-provider";
import type { BookingPrefill } from "@/lib/cal/embed";

type BookCallButtonProps = {
  className?: string;
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  children?: React.ReactNode;
  /** Shown before the label. Pass `null` to keep an existing icon layout. */
  icon?: LucideIcon | null;
  /** Only pass what is genuinely known about the visitor. Nothing sensitive. */
  prefill?: BookingPrefill;
  /** Defaults to "Book a Call". */
  label?: string;
  title?: string;
  "aria-label"?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

/**
 * Reusable entry point to the self-hosted Cal.com scheduler.
 * Opens a modal popup instead of navigating away. Falls back to /contact when
 * NEXT_PUBLIC_CAL_ORIGIN / NEXT_PUBLIC_CAL_LINK are not configured yet.
 */
export function BookCallButton({
  className,
  size = "default",
  variant = "default",
  children,
  icon: Icon = CalendarDays,
  prefill,
  label = "Book a Call",
  title,
  onClick,
  ...rest
}: BookCallButtonProps) {
  const { openBooking, configured } = useBookCall();

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    openBooking(prefill);
  };

  if (!configured) {
    return (
      <Button
        data-slot="button"
        size={size}
        variant={variant}
        className={className}
        onClick={onClick}
        render={<a href="/contact" />}
        title={title}
        {...rest}
      >
        {Icon ? <Icon aria-hidden="true" /> : null}
        {children ?? label}
      </Button>
    );
  }

  return (
    <Button
      data-slot="button"
      size={size}
      variant={variant}
      className={className}
      onClick={handleClick}
      title={title}
      {...rest}
    >
      {Icon ? <Icon aria-hidden="true" /> : null}
      {children ?? label}
    </Button>
  );
}
