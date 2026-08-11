"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type TeamPayrollHeaderActionsContextValue = {
  headerActions: ReactNode;
  setHeaderActions: (actions: ReactNode) => void;
};

const TeamPayrollHeaderActionsContext =
  createContext<TeamPayrollHeaderActionsContextValue | null>(null);

export function TeamPayrollHeaderActionsProvider({ children }: { children: ReactNode }) {
  const [headerActions, setHeaderActionsState] = useState<ReactNode>(null);

  const setHeaderActions = useCallback((actions: ReactNode) => {
    setHeaderActionsState(actions);
  }, []);

  const value = useMemo(
    () => ({ headerActions, setHeaderActions }),
    [headerActions, setHeaderActions],
  );

  return (
    <TeamPayrollHeaderActionsContext.Provider value={value}>
      {children}
    </TeamPayrollHeaderActionsContext.Provider>
  );
}

export function useTeamPayrollHeaderActions() {
  const context = useContext(TeamPayrollHeaderActionsContext);
  if (!context) {
    throw new Error(
      "useTeamPayrollHeaderActions must be used within TeamPayrollHeaderActionsProvider",
    );
  }
  return context;
}

export function useOptionalTeamPayrollHeaderActions() {
  return useContext(TeamPayrollHeaderActionsContext);
}

export function TeamPayrollHeaderActionsOutlet() {
  const context = useContext(TeamPayrollHeaderActionsContext);
  if (!context?.headerActions) return null;
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">{context.headerActions}</div>
  );
}
