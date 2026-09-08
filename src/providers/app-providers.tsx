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
          <Toaster
            richColors
            closeButton
            position="top-right"
            offset={12}
            gap={8}
            visibleToasts={3}
            toastOptions={{
              duration: 2800,
              classNames: {
                toast: "group toast !max-w-[22rem] !px-3.5 !py-2.5 !text-sm !shadow-md",
                title: "!text-sm !font-medium !leading-snug",
                description: "!text-xs !leading-snug",
                closeButton: "!left-auto !right-1 !top-1",
              },
            }}
          />
        </TooltipProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
