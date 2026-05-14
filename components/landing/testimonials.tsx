"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

const REVIEWS = [
  {
    name: "Jordan M.",
    handle: "@jordanflex",
    avatar: "J",
    color: "#6C63FF",
    text: "This app is insane 🔥 Generated a photo with a Ferrari in Monaco in less than 30 seconds. My followers thought it was real.",
    lang: "en",
  },
  {
    name: "Lucas B.",
    handle: "@lucasb_off",
    avatar: "L",
    color: "#F9CA1F",
    text: "Franchement incroyable. J'ai mis ma photo dans un jet privé et le résultat est ultra réaliste. Mes amis ont halluciné.",
    lang: "fr",
  },
  {
    name: "Karim D.",
    handle: "@karimdxb",
    avatar: "K",
    color: "#FF6B6B",
    text: "Best AI tool for content creators. The face swap is seamless and the scenes are premium quality. 10/10.",
    lang: "en",
  },
  {
    name: "Théo V.",
    handle: "@theov_life",
    avatar: "T",
    color: "#43D9AD",
    text: "Je l'utilise tous les jours pour mes réseaux. Les photos avec les supercars et les yachts sont dingues. Aucun studio ne peut faire ça aussi vite.",
    lang: "fr",
  },
  {
    name: "Marcus W.",
    handle: "@marcus_w",
    avatar: "M",
    color: "#FF9F43",
    text: "Used it for my Instagram and gained 2k followers in a week. The luxury lifestyle photos look completely authentic.",
    lang: "en",
  },
  {
    name: "Axel R.",
    handle: "@axelr_content",
    avatar: "A",
    color: "#54A0FF",
    text: "La qualité des images est bluffante. J'ai testé beaucoup d'applis IA mais celle-là est vraiment au-dessus. Le face swap est naturel.",
    lang: "fr",
  },
  {
    name: "Tyler S.",
    handle: "@tylersfinest",
    avatar: "T",
    color: "#EE5A24",
    text: "Finally an AI that actually gets luxury aesthetics. Every scene looks like a professional photoshoot. Worth every credit.",
    lang: "en",
  },
  {
    name: "Maxime F.",
    handle: "@maxime_flex",
    avatar: "M",
    color: "#A29BFE",
    text: "Trop bien ! J'ai généré une photo devant une Rolls-Royce pour mon profil LinkedIn. Les clients me demandent si c'est vrai 😂",
    lang: "fr",
  },
  {
    name: "Devon A.",
    handle: "@devonalpha",
    avatar: "D",
    color: "#00B894",
    text: "The prompts are incredibly detailed. I just pick a scene and my face gets integrated perfectly. Game changer for personal branding.",
    lang: "en",
  },
  {
    name: "Nathan G.",
    handle: "@nathan_goes",
    avatar: "N",
    color: "#FD79A8",
    text: "C'est surréaliste comme résultat. Le jet privé avec mon visage semblait sorti d'un vrai shooting à 10 000€. Pour quelques crédits.",
    lang: "fr",
  },
];

// Duplique pour une boucle infinie fluide
const DOUBLED = [...REVIEWS, ...REVIEWS];

function StarRow() {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className="w-3.5 h-3.5 fill-[#F9CA1F]" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: typeof REVIEWS[0] }) {
  return (
    <div className="flex-shrink-0 w-72 md:w-80 rounded-2xl bg-[#111113] border border-[#1E1E22] p-5 mx-3 flex flex-col gap-3">
      {/* Stars */}
      <StarRow />

      {/* Text */}
      <p className="text-sm text-zinc-300 leading-relaxed flex-1">
        "{review.text}"
      </p>

      {/* Author */}
      <div className="flex items-center gap-3 pt-1 border-t border-[#1E1E22]">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ backgroundColor: review.color + "33", border: `1px solid ${review.color}55` }}
        >
          <span style={{ color: review.color }}>{review.avatar}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-none">{review.name}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{review.handle}</p>
        </div>
        <div className="ml-auto">
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#0C0C0E] border border-[#2A2A2E] text-zinc-500">
            {review.lang === "fr" ? "🇫🇷" : "🇬🇧"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function Testimonials() {
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);

  // Animation CSS pure — plus fluide que JS
  return (
    <section className="w-full bg-[#0C0C0E] py-20 overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 mb-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium mb-3">
            Ils ont déjà flexé
          </p>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-white">
            La communauté en parle ✨
          </h2>
          <p className="mt-2 text-zinc-500 text-sm">
            Des milliers d'utilisateurs à travers le monde.
          </p>
        </motion.div>
      </div>

      {/* Ligne 1 — défile vers la gauche */}
      <div className="relative mb-4">
        <div
          ref={row1Ref}
          className="flex"
          style={{
            animation: "scroll-left 40s linear infinite",
          }}
        >
          {DOUBLED.map((review, i) => (
            <ReviewCard key={`r1-${i}`} review={review} />
          ))}
        </div>
      </div>

      {/* Ligne 2 — défile vers la droite (décalée) */}
      <div className="relative">
        <div
          ref={row2Ref}
          className="flex"
          style={{
            animation: "scroll-right 48s linear infinite",
          }}
        >
          {[...DOUBLED].reverse().map((review, i) => (
            <ReviewCard key={`r2-${i}`} review={review} />
          ))}
        </div>
      </div>

      {/* Dégradés masques sur les côtés */}
      <div className="pointer-events-none absolute left-0 top-0 w-24 h-full"
           style={{ background: "linear-gradient(to right, #0C0C0E, transparent)" }} />
      <div className="pointer-events-none absolute right-0 top-0 w-24 h-full"
           style={{ background: "linear-gradient(to left, #0C0C0E, transparent)" }} />

      {/* Keyframes CSS */}
      <style jsx>{`
        @keyframes scroll-left {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes scroll-right {
          0%   { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </section>
  );
}
