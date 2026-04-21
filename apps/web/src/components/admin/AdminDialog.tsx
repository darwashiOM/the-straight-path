import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

/**
 * Minimal admin modal shell. Centres content over a dimmed backdrop,
 * traps the Escape key to close, and exposes a close button. Intentionally
 * dumb — the caller owns layout, footer buttons, and submit wiring.
 */
export default function AdminDialog({ title, onClose, children, wide }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`my-8 w-full rounded-xl bg-white p-6 shadow-lg ${wide ? 'max-w-4xl' : 'max-w-2xl'}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-lg text-primary-700">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-ink/60 hover:bg-primary-50 hover:text-primary-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
