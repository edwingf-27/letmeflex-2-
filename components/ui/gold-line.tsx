import { cn } from "@/lib/utils";

interface GoldLineProps {
  className?: string;
}

export function GoldLine({ className }: GoldLineProps) {
  return (
    <div
      className={cn("h-[2px] w-full", className)}
      style={{
        background:
          "linear-gradient(90deg, transparent 0%, #F9CA1F 50%, transparent 100%)",
      }}
      aria-hidden
    />
  );
}
