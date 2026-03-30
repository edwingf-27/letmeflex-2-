import { Hero } from "@/components/landing/hero";
import { GoldLine } from "@/components/ui/gold-line";
import { CategoryGrid } from "@/components/landing/category-grid";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PricingSection } from "@/components/landing/pricing-section";
import { FAQ } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col bg-bg">
      <Hero />
      <GoldLine />
      <CategoryGrid />
      <GoldLine />
      <HowItWorks />
      <GoldLine />
      <PricingSection />
      <GoldLine />
      <FAQ />
      <Footer />
    </main>
  );
}
