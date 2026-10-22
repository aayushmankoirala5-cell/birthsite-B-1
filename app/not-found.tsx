import Link from "next/link";
export default function NotFound() {
  return (
    <main className="error-page">
      <span className="eyebrow">A LITTLE LOST IN THE MAGIC</span>
      <h1>
        This little celebration
        <br />
        isn’t here <em>yet.</em>
      </h1>
      <p>Check your invitation link, or take a peek at our birthday demo.</p>
      <Link className="primary-button" href="/">
        Discover the birthday demo →
      </Link>
    </main>
  );
}
