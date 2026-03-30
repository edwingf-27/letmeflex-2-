"use client";

import { useSession } from "next-auth/react";
import { useCallback } from "react";

export function useCredits() {
  const { data: session, update } = useSession();

  const credits = session?.user?.credits ?? 0;
  const plan = session?.user?.plan ?? "FREE";

  const refreshCredits = useCallback(async () => {
    await update();
  }, [update]);

  const deductCredits = useCallback(
    async (amount: number) => {
      const newCredits = Math.max(0, credits - amount);
      await update({ credits: newCredits });
    },
    [credits, update]
  );

  const hasEnoughCredits = useCallback(
    (required: number) => credits >= required,
    [credits]
  );

  const canUseFaceSwap = plan !== "FREE";

  return {
    credits,
    plan,
    refreshCredits,
    deductCredits,
    hasEnoughCredits,
    canUseFaceSwap,
  };
}
