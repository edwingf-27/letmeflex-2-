import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-8xl font-heading font-extrabold text-gold mb-4">
          404
        </h1>
        <p className="text-xl text-text-muted mb-8">
          This page doesn&apos;t exist. Maybe it&apos;s still generating.
        </p>
        <Link
          href="/"
          className="inline-block px-8 py-3 rounded-full bg-gold text-black font-heading font-bold text-sm uppercase tracking-wider hover:bg-gold-dark transition-colors shadow-gold"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
