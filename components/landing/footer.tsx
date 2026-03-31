import Link from "next/link";
import { cn } from "@/lib/utils";

const links = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Contact", href: "/contact" },
];

export function Footer() {
  return (
    <footer className="w-full bg-bg">
      {/* Gold gradient line separator */}
      <div className="gold-gradient-line w-full" aria-hidden="true" />

      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 py-12 md:flex-row md:justify-between">
        {/* Logo & tagline */}
        <div className="flex flex-col items-center gap-1 md:items-start">
          <span className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse-gold" />
            <span className="font-heading text-xl font-extrabold text-white">
              letmeflex<span className="text-gold">.ai</span>
            </span>
          </span>
          <span className="font-body text-xs text-text-subtle">
            AI-generated luxury content
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-body text-sm text-text-muted transition-colors hover:text-text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Built with AI */}
        <p className="font-body text-xs text-text-subtle">
          Built with AI &#10022;
        </p>
      </div>
    </footer>
  );
}
