import { Hero } from "@/components/landing/hero";
import { StudioDemo } from "@/components/landing/studio-demo";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Footer } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#0C0C0E]">
      {/* 1 — Titre */}
      <Hero />
      {/* 2 — Studio interactif */}
      <StudioDemo />
      {/* 3 — Comment ça marche */}
      <HowItWorks />
      <Footer />
    </main>
  );
}
