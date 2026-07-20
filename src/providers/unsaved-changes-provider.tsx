"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type UnsavedItem = {
  id: string;
  label: string;
};

type UnsavedChangesContextValue = {
  items: UnsavedItem[];
  register: (id: string, label: string, isDirty: boolean) => void;
};

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [dirtyMap, setDirtyMap] = useState<Map<string, string>>(() => new Map());

  const register = useCallback((id: string, label: string, isDirty: boolean) => {
    setDirtyMap((previous) => {
      const next = new Map(previous);
      if (isDirty) {
        next.set(id, label);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const items = useMemo(
    () =>
      Array.from(dirtyMap.entries()).map(([id, label]) => ({
        id,
        label,
      })),
    [dirtyMap],
  );

  const value = useMemo(() => ({ items, register }), [items, register]);

  return (
    <UnsavedChangesContext.Provider value={value}>{children}</UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    return { items: [] as UnsavedItem[], register: () => {} };
  }
  return context;
}

export function useRegisterUnsavedChanges(id: string, label: string, isDirty: boolean) {
  const { register } = useUnsavedChanges();

  useEffect(() => {
    register(id, label, isDirty);
    return () => register(id, label, false);
  }, [id, label, isDirty, register]);
}
