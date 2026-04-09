// This file configures the initialization of Sentry on the browser.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: "https://8e81f3729067fb0fb7b90158d59e49a0@o4511190387720192.ingest.de.sentry.io/4511190390341712",

  // Replay captures sessions on errors — 10% of sessions normally, 100% when an error occurs
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration(),
  ],

  // Lower trace sample rate — free tier allows 10k transactions/month
  tracesSampleRate: 0.2,

  // Enable logs to be sent to Sentry
  enableLogs: true,
})
