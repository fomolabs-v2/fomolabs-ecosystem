"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="not-found">
      <span className="eyebrow">CONNECTION INTERRUPTED</span>
      <h1>Something didn’t load.</h1>
      <p>Please try again. Your wallet remains in your control.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
