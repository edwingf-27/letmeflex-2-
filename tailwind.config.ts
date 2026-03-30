import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0C0C0E",
        surface: "#141416",
        "surface-2": "#1C1C1F",
        border: "#2A2A2E",
        gold: "#F9CA1F",
        "gold-glow": "rgba(249,202,31,0.18)",
        "gold-dark": "#C9A212",
        "text-primary": "#FFFFFF",
        "text-muted": "#8A8A95",
        "text-subtle": "#4A4A55",
      },
      fontFamily: {
        heading: ["Syne", "sans-serif"],
        body: ["Montserrat", "sans-serif"],
        display: ["Playfair Display", "serif"],
      },
      fontSize: {
        "display-1": ["72px", { lineHeight: "1.05", fontWeight: "800" }],
        "display-2": ["56px", { lineHeight: "1.1", fontWeight: "700" }],
        "display-3": ["36px", { lineHeight: "1.2", fontWeight: "600" }],
      },
      boxShadow: {
        gold: "0 8px 24px rgba(249,202,31,0.25), 0 2px 8px rgba(249,202,31,0.15)",
        "gold-hover": "0 12px 32px rgba(249,202,31,0.35)",
        "gold-sm": "0 0 0 3px rgba(249,202,31,0.12)",
      },
      borderRadius: {
        card: "16px",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "pulse-gold": "pulseGold 2s infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGold: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(249,202,31,0.3)" },
          "50%": { boxShadow: "0 0 0 12px rgba(249,202,31,0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
