"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <span className="eyebrow">A SMALL PAUSE IN THE MAGIC</span>
      <h1>
        Let’s try that <em>again.</em>
      </h1>
      <p>Your celebration couldn’t load. Give it another little moment.</p>
      <button className="primary-button" onClick={reset}>
        Try again →
      </button>
    </main>
  );
}
