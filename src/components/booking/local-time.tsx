"use client";

import { useEffect, useState } from "react";
import { formatClockInZone, zoneShort } from "@/lib/booking/time";

/**
 * Live wall-clock time in a zone ("2:30 PM PKT").
 *
 * The server renders a dash and the first client paint matches it, so there is
 * no hydration mismatch; the real time appears right after mount and refreshes
 * every 30s.
 */
export function LocalTime({
  timeZone,
  className,
}: {
  timeZone: string;
  className?: string;
}) {
  const [iso, setIso] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setIso(new Date().toISOString());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (!iso) return <span className={className}>&mdash;</span>;

  return (
    <time className={className}>
      {formatClockInZone(iso, timeZone)} {zoneShort(timeZone)}
    </time>
  );
}
