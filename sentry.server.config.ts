import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://fe5ddf52bc53c99cff4fbb80451067a1@o4510879270830080.ingest.us.sentry.io/4510879294947328",
  tracesSampleRate: 0.1,
});
