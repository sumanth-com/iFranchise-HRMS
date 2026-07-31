"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type BreadcrumbLabelContextValue = {
  label: string | null;
  setLabel: (label: string | null) => void;
};

const BreadcrumbLabelContext = createContext<BreadcrumbLabelContextValue | null>(null);

export function BreadcrumbLabelProvider({ children }: { children: ReactNode }) {
  const [label, setLabel] = useState<string | null>(null);
  const value = useMemo(() => ({ label, setLabel }), [label]);
  return (
    <BreadcrumbLabelContext.Provider value={value}>{children}</BreadcrumbLabelContext.Provider>
  );
}

export function useBreadcrumbLabelState() {
  return useContext(BreadcrumbLabelContext);
}

/** Sets the current page label in the top breadcrumb (cleared on unmount). */
export function useSetBreadcrumbLabel(label: string) {
  const ctx = useContext(BreadcrumbLabelContext);

  useEffect(() => {
    if (!ctx) return;
    ctx.setLabel(label);
    return () => ctx.setLabel(null);
  }, [ctx, label]);
}
