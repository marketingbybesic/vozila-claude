// Optional Sentry init — only loads when VITE_SENTRY_DSN is set, so dev
// builds and unconfigured deploys don't ship the SDK in the bundle.

export async function initSentry(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;
  try {
    const Sentry = await import('https://esm.sh/@sentry/browser@8?bundle' as any);
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_RELEASE ?? 'unknown',
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
      ],
    });
  } catch (e) {
    console.warn('[sentry] init skipped', e);
  }
}
