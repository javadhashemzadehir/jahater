import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// The caller supplies the accessible name (aria-label from useTranslations()).
function Spinner({ className, ...props }: React.ComponentProps<typeof Loader2>) {
  return (
    <Loader2 role="status" className={cn("size-4 motion-safe:animate-spin", className)} {...props} />
  );
}

export { Spinner };
