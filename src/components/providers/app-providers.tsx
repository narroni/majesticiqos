import type { ReactNode } from "react";

import { MotionProvider } from "@/components/motion/motion-provider";
import { Toaster } from "@/components/ui/sonner";

// No TooltipProvider here on purpose: nothing in the storefront renders a
// <Tooltip> (grepped the whole non-admin tree to confirm) — mounting the
// provider globally was pure dead weight in every page's bundle. If a
// future component needs one, wrap that specific subtree with
// TooltipProvider directly rather than re-adding it here.
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <MotionProvider>
      {children}
      <Toaster />
    </MotionProvider>
  );
}
