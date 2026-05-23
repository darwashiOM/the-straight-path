export default function LoadingScreen() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="border-primary-200 border-t-primary-600 h-10 w-10 animate-spin rounded-full border-2" />
        <span className="sr-only">Loading…</span>
      </div>
    </div>
  );
}
