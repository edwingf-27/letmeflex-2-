"use client";

import { useState, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { useCredits } from "./use-credits";

interface GenerateParams {
  category: string;
  subcategory: string;
  model?: string;
  brand?: string;
  color?: string;
  city?: string;
  shot?: string;
  isFaceSwap?: boolean;
  faceInputUrl?: string;
}

interface GenerationState {
  status: "idle" | "generating" | "completed" | "failed";
  imageUrl: string | null;
  generationId: string | null;
  error: string | null;
}

export function useGeneration() {
  const [state, setState] = useState<GenerationState>({
    status: "idle",
    imageUrl: null,
    generationId: null,
    error: null,
  });
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const { deductCredits } = useCredits();

  const generate = useCallback(
    async (params: GenerateParams) => {
      setState({
        status: "generating",
        imageUrl: null,
        generationId: null,
        error: null,
      });

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Generation failed");
        }

        const creditsUsed = params.isFaceSwap ? 2 : 1;
        deductCredits(creditsUsed);

        if (data.imageUrl) {
          setState({
            status: "completed",
            imageUrl: data.imageUrl,
            generationId: data.id,
            error: null,
          });
          toast.success("Your flex is ready!");
          return;
        }

        // Poll for status if not immediately available
        setState((prev) => ({
          ...prev,
          generationId: data.id,
        }));

        const poll = async () => {
          try {
            const statusRes = await fetch(
              `/api/generate/status/${data.id}`
            );
            const statusData = await statusRes.json();

            if (statusData.status === "COMPLETED" && statusData.imageUrl) {
              if (pollRef.current) clearInterval(pollRef.current);
              setState({
                status: "completed",
                imageUrl: statusData.imageUrl,
                generationId: data.id,
                error: null,
              });
              toast.success("Your flex is ready!");
            } else if (statusData.status === "FAILED") {
              if (pollRef.current) clearInterval(pollRef.current);
              setState({
                status: "failed",
                imageUrl: null,
                generationId: data.id,
                error: "Generation failed. Credits have been refunded.",
              });
              toast.error("Generation failed. Credits refunded.");
            }
          } catch {
            // Continue polling
          }
        };

        pollRef.current = setInterval(poll, 2000);

        // Safety timeout after 90 seconds
        setTimeout(() => {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            setState((prev) => {
              if (prev.status === "generating") {
                return {
                  ...prev,
                  status: "failed",
                  error: "Generation timed out. Please try again.",
                };
              }
              return prev;
            });
          }
        }, 90000);
      } catch (err: any) {
        setState({
          status: "failed",
          imageUrl: null,
          generationId: null,
          error: err.message,
        });
        toast.error(err.message || "Something went wrong");
      }
    },
    [deductCredits]
  );

  const reset = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    setState({
      status: "idle",
      imageUrl: null,
      generationId: null,
      error: null,
    });
  }, []);

  return { ...state, generate, reset };
}
