"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { CalendarCheck, ExternalLink, MessageCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  isCalConfigured,
  openCalModal,
  preloadCal,
  syncCalTheme,
  type BookingPrefill,
} from "@/lib/cal/embed";
import { buildBusinessChatLink, buildConfirmMessage } from "@/lib/notify/whatsapp";

interface BookingSuccess {
  uid?: string;
  title?: string;
  startTime?: string;
  videoCallUrl?: string;
}

interface BookCallContextValue {
  openBooking: (prefill?: BookingPrefill) => void;
  configured: boolean;
}

const BookCallContext = React.createContext<BookCallContextValue | null>(null);

export function useBookCall(): BookCallContextValue {
  const ctx = React.useContext(BookCallContext);
  if (!ctx) throw new Error("useBookCall must be used inside <BookCallProvider>");
  return ctx;
}

function formatSlot(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);
}

export function BookCallProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [success, setSuccess] = React.useState<BookingSuccess | null>(null);

  const bookingListenersAttached = React.useRef(false);
  const attachBookingListeners = React.useCallback(() => {
    if (bookingListenersAttached.current) return;
    bookingListenersAttached.current = true;
    void (async () => {
      const api = await import("@/lib/cal/embed").then((m) => m.getCalInstance());
      if (!api) return;
      api("on", {
        action: "bookingSuccessfulV2",
        callback: (event: CustomEvent<BookingSuccess>) => {
          setSuccess(event.detail ?? {});
        },
      });
      api("on", {
        action: "bookingCancelled",
        callback: () => setSuccess(null),
      });
    })();
  }, []);

  const openBooking = React.useCallback((prefill?: BookingPrefill) => {
    if (!isCalConfigured()) {
      console.warn("[cal] Book a Call is not configured yet");
      return;
    }
    attachBookingListeners();
    void openCalModal(prefill);
  }, [attachBookingListeners]);

  const configured = React.useMemo(() => isCalConfigured(), []);

  // Keep the Cal.com popup in step with the site's theme — only once the
  // embed has been created (see syncCalTheme: it does not initialise).
  React.useEffect(() => {
    if (configured) void syncCalTheme(resolvedTheme);
  }, [configured, resolvedTheme]);

  // Warm the embed on the user's FIRST pointerdown anywhere on the page —
  // never on mount. Keeps the ~3 MB Cal SDK off the initial payload while
  // still making the first "Book a Call" click feel instant.
  React.useEffect(() => {
    if (!configured) return;
    const warm = () => preloadCal();
    window.addEventListener("pointerdown", warm, { once: true });
    return () => window.removeEventListener("pointerdown", warm);
  }, [configured]);

  const slot = formatSlot(success?.startTime);
  const confirmLink = buildBusinessChatLink(
    buildConfirmMessage({
      startTime: success?.startTime,
      meetingUrl: success?.videoCallUrl,
      reference: success?.uid,
    }),
  );

  const value = React.useMemo(() => ({ openBooking, configured }), [openBooking, configured]);

  return (
    <BookCallContext.Provider value={value}>
      {children}

      <Dialog open={success !== null} onOpenChange={(open) => !open && setSuccess(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-primary/15 text-primary">
              <CalendarCheck className="size-6" aria-hidden="true" />
            </div>
            <DialogTitle>You&apos;re booked</DialogTitle>
            <DialogDescription>
              Cal.com has emailed you the calendar invite.{" "}
              {success?.title ? `${success.title} ` : ""}
              {slot ? `is set for ${slot}.` : "We will see you there."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            {success?.videoCallUrl ? (
              <a
                href={success.videoCallUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ className: "w-full" })}
              >
                <ExternalLink className="size-4" aria-hidden="true" />
                Join meeting
              </a>
            ) : null}

            {confirmLink ? (
              <a
                href={confirmLink}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline", className: "w-full" })}
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                Confirm on WhatsApp
              </a>
            ) : null}

            <Button variant="ghost" className="w-full" onClick={() => setSuccess(null)}>
              Close
            </Button>

            <a href="/book-a-call" className={buttonVariants({ variant: "ghost", className: "w-full" })}>
              Browse all available times
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </BookCallContext.Provider>
  );
}
