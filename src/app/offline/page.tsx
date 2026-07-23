export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-base px-6 text-center">
      <h1 className="font-display text-2xl uppercase tracking-tight text-cream">
        You&apos;re offline
      </h1>
      <p className="mt-3 max-w-xs text-sm text-sage">
        Daggadex ClubOS needs a connection to show the live menu and your
        requests. Reconnect and try again.
      </p>
    </div>
  );
}
