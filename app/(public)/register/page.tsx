"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
});

type FieldErrors = Partial<Record<"name" | "email" | "password", string>>;

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0C0C0E]" />}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref") || "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setGeneralError("");

    const result = registerSchema.safeParse({ name, email, password });
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          referralCode: referralCode || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGeneralError(data.error || "Registration failed.");
        setLoading(false);
        return;
      }

      // Auto sign-in after successful registration
      const signInRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInRes?.error) {
        // Registration succeeded but auto-login failed, redirect to login
        router.push("/login");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setGeneralError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    // Pass referral code through the callback URL so it can be used post-OAuth
    const callbackUrl = referralCode
      ? `/dashboard?ref=${referralCode}`
      : "/dashboard";
    await signIn("google", { callbackUrl });
  }

  return (
    <div className="min-h-screen bg-[#0C0C0E] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F9CA1F] animate-pulse" /><span className="font-heading text-3xl font-extrabold text-white">letmeflex<span className="text-[#F9CA1F]">.ai</span></span></div>
          <p className="text-zinc-500 mt-2 text-sm">
            Create your account and start flexing
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#141416] border border-[#2A2A2E] rounded-2xl p-8">
          {generalError && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {generalError}
            </div>
          )}

          {referralCode && (
            <div className="mb-6 p-3 rounded-lg bg-[#F9CA1F]/10 border border-[#F9CA1F]/20 text-[#F9CA1F] text-sm text-center">
              You were referred! You&apos;ll get 2 bonus credits on signup.
            </div>
          )}

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-[#2A2A2E] bg-[#0C0C0E] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1e] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#2A2A2E]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#141416] px-3 text-zinc-500">
                or register with email
              </span>
            </div>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Hidden referral code */}
            <input type="hidden" name="referralCode" value={referralCode} />

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-zinc-400 mb-1.5"
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                className="w-full rounded-lg border border-[#2A2A2E] bg-[#0C0C0E] px-4 py-2.5 text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9CA1F]/40 focus:border-[#F9CA1F]/40 transition-colors"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-400">{errors.name}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-400 mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full rounded-lg border border-[#2A2A2E] bg-[#0C0C0E] px-4 py-2.5 text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9CA1F]/40 focus:border-[#F9CA1F]/40 transition-colors"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">{errors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-400 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                className="w-full rounded-lg border border-[#2A2A2E] bg-[#0C0C0E] px-4 py-2.5 text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9CA1F]/40 focus:border-[#F9CA1F]/40 transition-colors"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-400">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#F9CA1F] px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#F9CA1F]/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[#F9CA1F] font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
