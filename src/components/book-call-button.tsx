"use client";

import { CalendarDays, type LucideIcon } from "lucide-react";
import Link from "next/link";
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
  /** Only pass what is genuinely known about the visitor. Nothing sensitive. Modal mode only. */
  prefill?: BookingPrefill;
  /** Defaults to "Book a Call". */
  label?: string;
  title?: string;
  "aria-label"?: string;
  /**
   * "page" (default) navigates to the dedicated /book-a-call scheduler.
   * "modal" reopens the Cal.com popup. Use only where a popup is genuinely wanted.
   */
  mode?: "page" | "modal";
  onClick?: React.MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>;
};

/**
 * Reusable entry point to the scheduler.
 *
 * Defaults to navigating to the dedicated `/book-a-call` page, which is our own
 * Calendly-style UI backed by the Cal.com API. Pass `mode="modal"` for the
 * Cal.com popup instead.
 *
 * Falls back to /contact when NEXT_PUBLIC_CAL_ORIGIN / NEXT_PUBLIC_CAL_LINK are
 * not configured, because there is then no Cal instance to show either way.
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
  mode = "page",
  onClick,
  ...rest
}: BookCallButtonProps) {
  const { openBooking, configured } = useBookCall();

  const body = (
    <>
      {Icon ? <Icon aria-hidden="true" /> : null}
      {children ?? label}
    </>
  );

  // Nothing to book against yet: send them to the contact form.
  if (!configured) {
    return (
      <Button
        data-slot="button"
        size={size}
        variant={variant}
        className={className}
        render={<a href="/contact" />}
        title={title}
        {...rest}
      >
        {body}
      </Button>
    );
  }

  if (mode === "modal") {
    const handleClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
      (onClick as React.MouseEventHandler<HTMLButtonElement> | undefined)?.(event);
      if (event.defaultPrevented) return;
      openBooking(prefill);
    };

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
        {body}
      </Button>
    );
  }

  return (
    <Button
      data-slot="button"
      size={size}
      variant={variant}
      className={className}
      render={<Link href="/book-a-call" />}
      title={title}
      onClick={onClick}
      {...rest}
    >
      {body}
    </Button>
  );
}