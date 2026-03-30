"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { PLANS, type PlanKey } from "@/lib/stripe";
import { cn } from "@/lib/utils";
import {
  User,
  Mail,
  Crown,
  ExternalLink,
  Loader2,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const user = session?.user;
  const currentPlan = (user?.plan ?? "FREE") as PlanKey;

  const [name, setName] = useState(user?.name || "");
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [managingSubscription, setManagingSubscription] = useState(false);

  const handleSaveName = async () => {
    if (!name.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }
    setSavingName(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to update name");
      }
      await updateSession();
      toast.success("Name updated successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update name.");
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error("Enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to change password");
      }
      toast.success("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleManageSubscription = async () => {
    setManagingSubscription(true);
    try {
      const res = await fetch("/api/credits/manage", {
        method: "POST",
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to open portal");
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to open subscription portal.");
      setManagingSubscription(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold">Settings</h1>
        <p className="text-text-muted mt-1 text-sm">
          Manage your account and preferences.
        </p>
      </div>

      {/* Account Info */}
      <div className="rounded-2xl bg-surface border border-border p-6 space-y-6">
        <h2 className="font-heading font-semibold text-lg">Account</h2>

        {/* Name */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
            Name
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-gold/40 transition-colors"
              />
            </div>
            <button
              onClick={handleSaveName}
              disabled={savingName || name === user?.name}
              className={cn(
                "px-5 py-3 rounded-xl font-heading font-bold text-sm transition-all",
                name !== user?.name
                  ? "bg-gold text-black hover:bg-gold-dark"
                  : "bg-surface-2 border border-border text-text-subtle cursor-not-allowed"
              )}
            >
              {savingName ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Save"
              )}
            </button>
          </div>
        </div>

        {/* Email (readonly) */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
            <input
              type="email"
              value={user?.email || ""}
              readOnly
              className="w-full bg-surface-2 border border-border rounded-xl pl-11 pr-4 py-3 text-sm text-text-muted cursor-not-allowed"
            />
          </div>
        </div>

        {/* Plan */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
            Current Plan
          </label>
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface-2 border border-border">
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-gold" />
              <div>
                <p className="font-heading font-semibold">
                  {PLANS[currentPlan].name}
                </p>
                <p className="text-xs text-text-muted">
                  {currentPlan === "FREE"
                    ? "Limited features"
                    : `${PLANS[currentPlan].monthlyCredits >= 999999 ? "Unlimited" : PLANS[currentPlan].monthlyCredits} credits/month`}
                </p>
              </div>
            </div>
            {currentPlan !== "FREE" && (
              <button
                onClick={handleManageSubscription}
                disabled={managingSubscription}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-border hover:border-gold/20 text-sm font-medium transition-colors"
              >
                {managingSubscription ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Manage Subscription
                    <ExternalLink className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Password Change */}
      <div className="rounded-2xl bg-surface border border-border p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-text-muted" />
          <h2 className="font-heading font-semibold text-lg">
            Change Password
          </h2>
        </div>

        {/* Current Password */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
            Current Password
          </label>
          <div className="relative">
            <input
              type={showCurrentPassword ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 pr-11 text-sm placeholder:text-text-subtle focus:outline-none focus:border-gold/40 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-subtle hover:text-text-muted"
            >
              {showCurrentPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
            New Password
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 pr-11 text-sm placeholder:text-text-subtle focus:outline-none focus:border-gold/40 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-subtle hover:text-text-muted"
            >
              {showNewPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
            Confirm New Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
            className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm placeholder:text-text-subtle focus:outline-none focus:border-gold/40 transition-colors"
          />
        </div>

        <button
          onClick={handleChangePassword}
          disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
          className={cn(
            "w-full py-3 rounded-xl font-heading font-bold text-sm transition-all",
            currentPassword && newPassword && confirmPassword
              ? "bg-gold text-black hover:bg-gold-dark"
              : "bg-surface-2 border border-border text-text-subtle cursor-not-allowed"
          )}
        >
          {savingPassword ? (
            <Loader2 className="w-4 h-4 animate-spin mx-auto" />
          ) : (
            "Change Password"
          )}
        </button>
      </div>
    </div>
  );
}
