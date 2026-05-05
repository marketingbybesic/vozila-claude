// PWA helpers — service-worker registration + install prompt management.
// Only registers in production. Install-prompt event is captured and made
// available via an exported handler.

let deferredPrompt: any = null;
let promptListeners: Set<(canInstall: boolean) => void> = new Set();

export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => {
      console.warn('[pwa] sw register failed', e);
    });
  });
}

// Hook the beforeinstallprompt event globally so a deep button can call
// promptInstall() later.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: any) => {
    e.preventDefault();
    deferredPrompt = e;
    promptListeners.forEach((fn) => fn(true));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    promptListeners.forEach((fn) => fn(false));
  });
}

export function canInstall(): boolean {
  return !!deferredPrompt;
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  promptListeners.forEach((fn) => fn(false));
  return outcome;
}

export function onInstallAvailability(fn: (canInstall: boolean) => void): () => void {
  promptListeners.add(fn);
  fn(!!deferredPrompt);
  return () => promptListeners.delete(fn);
}
