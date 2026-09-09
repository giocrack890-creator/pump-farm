"use client";

import { type ReactNode, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletProvider } from "@/components/providers/WalletProvider";
import { SoundProvider } from "@/components/providers/SoundProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <SoundProvider>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      </SoundProvider>
    </WalletProvider>
  );
}
