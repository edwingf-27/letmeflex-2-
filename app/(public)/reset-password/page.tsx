"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0C0C0E]" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
      } else {
        setMessage(data.message);
        setDone(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
      } else {
        setMessage("Password reset successfully!");
        setDone(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0C0C0E] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F9CA1F] animate-pulse" /><span className="font-heading text-3xl font-extrabold text-white">letmeflex<span className="text-[#F9CA1F]">.ai</span></span></div>
          <p className="text-zinc-500 mt-2 text-sm">
            {token ? "Set your new password" : "Reset your password"}
          </p>
        </div>

        <div className="bg-[#141416] border border-[#2A2A2E] rounded-2xl p-8">
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-6 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              {message}
            </div>
          )}

          {done ? (
            <div className="text-center">
              <Link
                href="/login"
                className="inline-block w-full rounded-lg bg-[#F9CA1F] px-4 py-2.5 text-sm font-semibold text-black text-center hover:bg-[#F9CA1F]/90"
              >
                Go to Login
              </Link>
            </div>
          ) : token ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-[#2A2A2E] bg-[#0C0C0E] px-4 py-2.5 text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9CA1F]/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-[#2A2A2E] bg-[#0C0C0E] px-4 py-2.5 text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9CA1F]/40"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#F9CA1F] px-4 py-2.5 text-sm font-semibold text-black hover:bg-[#F9CA1F]/90 disabled:opacity-50"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-lg border border-[#2A2A2E] bg-[#0C0C0E] px-4 py-2.5 text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9CA1F]/40"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#F9CA1F] px-4 py-2.5 text-sm font-semibold text-black hover:bg-[#F9CA1F]/90 disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-zinc-500">
            <Link href="/login" className="text-[#F9CA1F] font-medium hover:underline">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
