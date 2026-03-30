import * as React from "react";
import { cn } from "@/lib/utils";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "font-body text-[12px] font-medium uppercase tracking-[0.08em] text-text-muted",
        className
      )}
      {...props}
    />
  )
);

Label.displayName = "Label";

export { Label };
export type { LabelProps };
