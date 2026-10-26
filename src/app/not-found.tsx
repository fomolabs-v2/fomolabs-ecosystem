import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main-content" className="not-found">
      <span className="eyebrow">404 / OUT OF ORBIT</span>
      <h1>Let’s get you back.</h1>
      <p>This page doesn’t exist.</p>
      <Link href="/" className="button primary">
        Back to FomoLabs
      </Link>
    </main>
  );
}
