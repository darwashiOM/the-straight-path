import { useEffect, useState } from 'react';

/**
 * PWA Install Banner
 *
 * Listens for the `beforeinstallprompt` event (Chromium/Edge/Samsung Internet)
 * and surfaces a dismissible bottom-right banner prompting the user to install
 * The Straight Path as an app. Dismissal is persisted in localStorage so we
 * don't nag returning visitors.
 *
 * TODO: wire this component into the app shell.
 *   Suggested import: `import PWAInstallBanner from '@/components/PWAInstallBanner';`
 *   Then render `<PWAInstallBanner />` once near the root of `App.tsx`
 *   (typically just before `<Footer />` or inside the top-level layout).
 *   Not wired here to avoid a merge conflict with the i18n agent editing App.tsx.
 */

const DISMISS_KEY = 'tsp:pwa-install-dismissed';

// Minimal type for the non-standard event. Shipped in Chromium browsers.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Honor previous dismissal.
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === '1') return;
    } catch {
      // localStorage can throw in private mode; fall through and still show.
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall as EventListener);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall as EventListener);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'dismissed') {
        try {
          window.localStorage.setItem(DISMISS_KEY, '1');
        } catch {
          /* ignore */
        }
      }
    } finally {
      setDeferredPrompt(null);
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install The Straight Path"
      className="border-primary-500/20 dark:border-primary-700/40 dark:bg-primary-800/95 fixed bottom-4 right-4 z-50 max-w-[22rem] rounded-xl border bg-white/95 p-4 shadow-lg backdrop-blur"
      style={{
        bottom: 'max(1rem, env(safe-area-inset-bottom))',
        right: 'max(1rem, env(safe-area-inset-right))',
      }}
    >
      <div className="flex items-start gap-3">
        <img src="/icon-192.png" alt="" width={40} height={40} className="rounded-lg" />
        <div className="flex-1">
          <p className="text-primary-700 dark:text-paper text-sm font-semibold">
            Install The Straight Path
          </p>
          <p className="text-ink/70 dark:text-paper/70 mt-0.5 text-xs">
            Add to your home screen for quick access, offline reading, and a cleaner experience.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={install}
              className="bg-primary-500 hover:bg-primary-600 active:bg-primary-700 inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
            >
              Install
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="text-ink/70 hover:bg-primary-50 dark:text-paper/80 dark:hover:bg-primary-700 inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install banner"
          className="text-ink/50 hover:bg-primary-50 hover:text-ink dark:text-paper/60 dark:hover:bg-primary-700 ml-1 rounded p-1"
        >
          <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
