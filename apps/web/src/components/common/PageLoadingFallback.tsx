export function PageLoadingFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-full min-h-[12rem] items-center justify-center text-sm text-[var(--aurea-text-muted)]"
    >
      Carregando área…
    </div>
  );
}
