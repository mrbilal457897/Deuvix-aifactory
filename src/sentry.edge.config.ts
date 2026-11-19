import * as Sentry from "@sentry/nextjs";

/**
 * Edge runtime (middleware, proxy, edge routes) — shares the server pattern.
 */

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.request?.headers) {
        delete (event.request.headers as Record<string, unknown>).cookie;
        delete (event.request.headers as Record<string, unknown>).authorization;
      }
      return event;
    },
  });
}
