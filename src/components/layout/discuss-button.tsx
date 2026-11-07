"use client";

import Link from "next/link";
import { MessageCircle, type LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DiscussButtonProps = {
  className?: string;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "secondary" | "outline";
  icon?: LucideIcon | null;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

/** Entry point to the discussion/consultation flow — mirrors Book a Call. */
export function DiscussButton({
  className,
  size = "default",
  variant = "default",
  icon: Icon = MessageCircle,
  onClick,
}: DiscussButtonProps) {
  return (
    <Link
      data-slot="button"
      href="/contact"
      className={cn(buttonVariants({ variant, size, className }))}
      onClick={onClick}
    >
      {Icon ? <Icon aria-hidden="true" /> : null}
      Discuss
    </Link>
  );
}
