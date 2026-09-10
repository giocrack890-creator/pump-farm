"use client";

import { type ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletProvider } from "@/components/providers/WalletProvider";
import { SoundProvider } from "@/components/providers/SoundProvider";
import { GameToastHost } from "@/components/hud/GameToast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <SoundProvider>
        <TooltipProvider delayDuration={200}>
          {children}
          <GameToastHost />
        </TooltipProvider>
      </SoundProvider>
    </WalletProvider>
  );
}
