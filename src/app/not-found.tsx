import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="building">
      <h1>This page does not exist</h1>
      <p className="muted">LegacyWiki doesn’t have an article with this exact name.</p>
      <p>
        <Link className="btn" href="/">
          Go to LegacyWiki
        </Link>
      </p>
    </main>
  );
}
