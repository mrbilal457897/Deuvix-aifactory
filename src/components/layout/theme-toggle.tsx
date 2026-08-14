"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const TRANSITION_MS = 300;

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const toggle = () => {
    document.documentElement.classList.add("theme-transitioning");
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
    window.setTimeout(
      () => document.documentElement.classList.remove("theme-transitioning"),
      TRANSITION_MS + 50
    );
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="relative size-10 md:size-9 rounded-lg"
      aria-label="Toggle theme"
    >
      <Sun className="absolute size-[1.2rem] rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-[1.2rem] rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
