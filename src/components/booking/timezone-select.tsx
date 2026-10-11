"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TIME_ZONES, zoneLabel, zoneShort } from "@/lib/booking/time";

interface Option {
  value: string;
  label: string;
  short: string;
}

/**
 * Searchable time-zone combobox.
 *
 * A plain <select> with 50+ zones is unusable on mobile, and visitors often
 * only know their city or abbreviation, so both the IANA name and the label are
 * searchable. Keeps native keyboard semantics (arrows / Enter / Escape).
 */
export function TimezoneSelect({
  value,
  onChange,
  className,
  ariaLabel = "Time zone",
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const all = useMemo<Option[]>(() => {
    const listed: Option[] = TIME_ZONES.map((t) => ({ value: t.value, label: t.label, short: t.short }));
    // A browser zone that is not in our curated list still has to be selectable.
    if (value && !listed.some((o) => o.value === value)) {
      listed.unshift({ value, label: value, short: zoneShort(value) });
    }
    return listed;
  }, [value]);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((o) => `${o.label} ${o.value} ${o.short}`.toLowerCase().includes(q));
  }, [all, query]);

  // Close on outside pointerdown.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

  // Focus the search box after the popover paints. DOM-only, no state.
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  // Clamp the highlight into the current filtered list without an inner state
  // effect: derived value, updated in the render pass.
  const safeActive = Math.min(active, Math.max(0, options.length - 1));

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${safeActive}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [safeActive, open]);

  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = options[safeActive];
      if (opt) choose(opt.value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          const idx = all.findIndex((o) => o.value === value);
          setActive(idx >= 0 ? idx : 0);
          setQuery("");
          setOpen(true);
        }}
        className="border-border bg-background text-foreground flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-[min(var(--radius-md),12px)] border px-2.5 text-left text-sm sm:h-8"
      >
        <span className="min-w-0 truncate">{zoneLabel(value)}</span>
        <ChevronDown className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
      </button>

      {open ? (
        <div className="border-border bg-popover text-popover-foreground absolute right-0 z-50 mt-1 w-full min-w-[16rem] rounded-[min(var(--radius-md),12px)] border shadow-md sm:w-[19rem]">
          <div className="border-border border-b p-2">
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              role="combobox"
              aria-expanded={open}
              aria-controls="tz-listbox"
              aria-autocomplete="list"
              aria-activedescendant={options[safeActive] ? `tz-opt-${options[safeActive].value}` : undefined}
              placeholder="Search city or time zone"
              className="border-border bg-background text-foreground h-9 w-full rounded-[min(var(--radius-md),10px)] border px-2.5 text-sm outline-none focus-visible:border-ring"
            />
          </div>
          <ul
            ref={listRef}
            id="tz-listbox"
            role="listbox"
            aria-label={ariaLabel}
            className="max-h-64 overflow-y-auto overscroll-contain p-1"
          >
            {options.length === 0 ? (
              <li className="text-muted-foreground px-2.5 py-2 text-sm">No matching time zone.</li>
            ) : (
              options.map((opt, i) => (
                <li
                  key={opt.value}
                  id={`tz-opt-${opt.value}`}
                  data-index={i}
                  role="option"
                  aria-selected={opt.value === value}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(opt.value)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 rounded-[min(var(--radius-md),10px)] px-2.5 py-2 text-sm",
                    i === safeActive ? "bg-muted" : "",
                  )}
                >
                  <span className="min-w-0 truncate">{opt.label}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span className="text-muted-foreground text-xs">{opt.short}</span>
                    {opt.value === value ? <Check className="text-primary size-4" aria-hidden="true" /> : null}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
