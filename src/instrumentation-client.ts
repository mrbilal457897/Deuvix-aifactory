import * as Sentry from "@sentry/nextjs";

/**
 * Client-side error monitoring. Uses NEXT_PUBLIC_SENTRY_DSN (required to reach
 * the browser bundle); falls back to SENTRY_DSN so a single env var covers it
 * when set via your build tool. Keep the sample rate low.
 */

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    // PII scrubbing happens in beforeSend — never forward cookies/auth headers.
    beforeSend(event) {
      if (event.request?.headers) {
        delete (event.request.headers as Record<string, unknown>).cookie;
        delete (event.request.headers as Record<string, unknown>).authorization;
      }
      return event;
    },
    ignoreErrors: ["ResizeObserver loop limit exceeded"],
  });
}
