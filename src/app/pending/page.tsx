export default function PendingPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-base px-6 text-center">
      <h1 className="font-display text-3xl uppercase tracking-tight text-cream">
        You&apos;re on the list
      </h1>
      <p className="mt-3 max-w-sm text-sm text-sage">
        Your membership is being reviewed. We&apos;ll let you know the
        moment you&apos;re in — no need to do anything else for now.
      </p>
      <form action="/auth/signout" method="post" className="mt-8">
        <button
          type="submit"
          className="rounded-sm border border-sage/30 px-4 py-2 text-sm text-sage hover:text-cream"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
