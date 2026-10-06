import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN;

const enabled =
  Boolean(dsn) &&
  (import.meta.env.PROD || import.meta.env.VITE_SENTRY_ENABLED === 'true');

if (enabled) {
  Sentry.init({
    dsn,
    environment:
      import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,

    integrations: [Sentry.browserTracingIntegration()],

    // 운영 트래픽의 10%만 성능 추적
    tracesSampleRate: 0.1,

    // 우선 같은 출처 요청만 추적
    tracePropagationTargets: [/^\/(?!\/)/],
  });
}