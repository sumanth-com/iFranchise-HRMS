"use client";

import { type ReactNode } from "react";
import { Toaster } from "sonner";

import { ChunkLoadRecovery } from "@/components/common/chunk-load-recovery";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <TooltipProvider>
          <ChunkLoadRecovery />
          {children}
          <Toaster richColors closeButton position="top-right" />
        </TooltipProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
