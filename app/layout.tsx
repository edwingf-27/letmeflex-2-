import type { Metadata } from "next";
import { Syne, Montserrat, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { QueryProvider } from "@/components/ui/query-provider";
import { SessionProvider } from "next-auth/react";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "letmeflex.ai — Flex Without Limits",
  description:
    "Generate ultra-realistic luxury lifestyle photos with AI. Watches, supercars, yachts, penthouses — all yours.",
  openGraph: {
    title: "letmeflex.ai — Flex Without Limits",
    description:
      "Generate ultra-realistic luxury lifestyle photos with AI.",
    siteName: "letmeflex.ai",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${montserrat.variable} ${playfair.variable}`}
    >
      <body className="bg-bg text-text-primary font-body antialiased">
        <SessionProvider>
          <QueryProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "#141416",
                  color: "#FFFFFF",
                  border: "1px solid #2A2A2E",
                  borderRadius: "12px",
                  fontFamily: "Montserrat, sans-serif",
                  fontSize: "14px",
                },
                success: {
                  iconTheme: {
                    primary: "#F9CA1F",
                    secondary: "#000",
                  },
                },
                error: {
                  iconTheme: {
                    primary: "#ef4444",
                    secondary: "#fff",
                  },
                },
              }}
            />
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
