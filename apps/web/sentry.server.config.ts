import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "https://mock@o0.ingest.sentry.io/0",
  tracesSampleRate: 1,
  debug: false,
});
