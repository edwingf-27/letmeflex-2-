"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-4xl font-heading font-bold text-text-primary mb-4">
          Something went wrong
        </h1>
        <p className="text-text-muted mb-8 max-w-md mx-auto">
          An unexpected error occurred. Please try again or contact support if
          the problem persists.
        </p>
        <button
          onClick={reset}
          className="inline-block px-8 py-3 rounded-full bg-gold text-black font-heading font-bold text-sm uppercase tracking-wider hover:bg-gold-dark transition-colors shadow-gold"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
