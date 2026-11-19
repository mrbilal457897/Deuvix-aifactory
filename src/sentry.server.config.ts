import * as Sentry from "@sentry/nextjs";

/**
 * Server-side error monitoring. Inert until SENTRY_DSN is set (production
 * only recommended). Keep the sample rate low — this is telemetry, not
 * logging.
 */

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Low sample rate — telemetry, not logging.
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.request?.headers) {
        delete (event.request.headers as Record<string, unknown>).cookie;
        delete (event.request.headers as Record<string, unknown>).authorization;
      }
      return event;
    },
    ignoreErrors: ["Non-Error promise rejection captured"],
  });
}
