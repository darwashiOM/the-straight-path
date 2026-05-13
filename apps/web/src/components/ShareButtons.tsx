import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link2, Share2, Twitter, MessageCircle, Check } from 'lucide-react';

interface ShareButtonsProps {
  /** Absolute URL to share. */
  url: string;
  /** Title of the article, used for the share sheet / tweet text. */
  title: string;
  /** Short description, appended to the tweet when available. */
  description?: string;
}

/**
 * Article share controls.
 *
 * - When `navigator.share` exists (mobile + Safari 16+), a single "Share"
 *   button opens the native share sheet.
 * - Otherwise (desktop Firefox/Chrome), the component renders explicit
 *   targets: copy link, X (formerly Twitter), WhatsApp.
 * - "Link copied" toast appears for ~2 seconds after a successful copy.
 */
export default function ShareButtons({ url, title, description }: ShareButtonsProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const showCopied = () => {
    setCopied(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  const copy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for non-secure contexts / older browsers.
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      showCopied();
    } catch {
      // Swallow — the user can still use the explicit share targets.
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title, text: description, url });
    } catch {
      // User cancelled or share failed — fall back to clipboard quietly.
      copy();
    }
  };

  const twitterUrl =
    'https://twitter.com/intent/tweet?' + new URLSearchParams({ url, text: title }).toString();

  const whatsappUrl =
    'https://wa.me/?' + new URLSearchParams({ text: `${title} ${url}` }).toString();

  const shareLabel = t('articlesPage.share', 'Share') as string;
  const copyLabel = t('articlesPage.copyLink', 'Copy link') as string;
  const copiedLabel = t('articlesPage.linkCopied', 'Link copied') as string;

  return (
    <div className="border-primary-500/10 dark:border-primary-700/40 mt-12 flex flex-wrap items-center gap-3 border-t pt-8">
      <span className="text-accent-500 font-serif text-sm uppercase tracking-widest">
        {shareLabel}
      </span>

      {canNativeShare ? (
        <button
          type="button"
          onClick={nativeShare}
          className="border-primary-500/20 bg-paper/60 text-primary-700 hover:border-accent-400 hover:text-primary-800 dark:border-primary-700/50 dark:bg-primary-800/40 dark:text-paper/80 dark:hover:text-accent-300 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition"
        >
          <Share2 size={14} /> {shareLabel}
        </button>
      ) : null}

      <button
        type="button"
        onClick={copy}
        aria-live="polite"
        className="border-primary-500/20 bg-paper/60 text-primary-700 hover:border-accent-400 hover:text-primary-800 dark:border-primary-700/50 dark:bg-primary-800/40 dark:text-paper/80 dark:hover:text-accent-300 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition"
      >
        {copied ? <Check size={14} /> : <Link2 size={14} />} {copied ? copiedLabel : copyLabel}
      </button>

      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="border-primary-500/20 bg-paper/60 text-primary-700 hover:border-accent-400 hover:text-primary-800 dark:border-primary-700/50 dark:bg-primary-800/40 dark:text-paper/80 dark:hover:text-accent-300 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition"
      >
        <Twitter size={14} /> X / Twitter
      </a>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="border-primary-500/20 bg-paper/60 text-primary-700 hover:border-accent-400 hover:text-primary-800 dark:border-primary-700/50 dark:bg-primary-800/40 dark:text-paper/80 dark:hover:text-accent-300 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition"
      >
        <MessageCircle size={14} /> WhatsApp
      </a>

      {/* Live-region toast. Visible; also aria-live on the copy button covers
          SR users on browsers that don't announce visually-shown text. */}
      <div
        role="status"
        aria-live="polite"
        className={
          'bg-primary-700 text-paper dark:bg-accent-500 dark:text-ink pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-sm shadow-lg transition-opacity duration-200 ' +
          (copied ? 'opacity-100' : 'opacity-0')
        }
      >
        {copiedLabel}
      </div>
    </div>
  );
}
