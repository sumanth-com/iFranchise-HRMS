"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import { Button } from "@/components/common/button";
import { cn } from "@/lib/utils";

type ApprovalSelectCheckboxProps = {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  ariaLabel: string;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
};

export function ApprovalSelectCheckbox({
  checked,
  indeterminate = false,
  disabled = false,
  ariaLabel,
  onCheckedChange,
  className,
}: ApprovalSelectCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate && !checked;
    }
  }, [checked, indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "size-4 shrink-0 rounded border-input accent-violet-600 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      checked={checked}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(event: ChangeEvent<HTMLInputElement>) => {
        onCheckedChange(event.target.checked);
      }}
      onClick={(event) => event.stopPropagation()}
    />
  );
}

type ApprovalBulkToolbarProps = {
  selectedCount: number;
  disabled?: boolean;
  onApprove: () => void;
  onReject: () => void;
};

export function ApprovalBulkToolbar({
  selectedCount,
  disabled = false,
  onApprove,
  onReject,
}: ApprovalBulkToolbarProps) {
  if (selectedCount <= 0) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2">
      <p className="text-sm font-medium text-foreground">
        {selectedCount} selected
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          className="h-8 gap-1.5"
          disabled={disabled}
          onClick={onApprove}
        >
          <CheckCircle2 className="size-3.5" />
          Approve selected
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5"
          disabled={disabled}
          onClick={onReject}
        >
          <XCircle className="size-3.5" />
          Reject selected
        </Button>
      </div>
    </div>
  );
}

export function useApprovalSelection(rowIds: string[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const idKey = rowIds.join("|");

  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const allowed = new Set(rowIds);
      const next = new Set<string>();
      for (const id of prev) {
        if (allowed.has(id)) next.add(id);
      }
      return next.size === prev.size ? prev : next;
    });
    // Re-sync when the visible id set changes (queue refresh / filter).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idKey captures rowIds membership
  }, [idKey]);

  const selectedCount = selectedIds.size;
  const allSelected =
    rowIds.length > 0 && rowIds.every((id) => selectedIds.has(id));
  const someSelected = selectedCount > 0 && !allSelected;

  const toggleOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(
    (checked: boolean) => {
      setSelectedIds(checked ? new Set(rowIds) : new Set());
    },
    [rowIds],
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedList = useMemo(() => Array.from(selectedIds), [selectedIds]);

  return {
    selectedIds,
    selectedList,
    selectedCount,
    allSelected,
    someSelected,
    toggleOne,
    toggleAll,
    clearSelection,
  };
}

export type BulkDecisionSummary = {
  succeeded: number;
  failed: number;
  errors: string[];
};

export function summarizeBulkResult(
  result: BulkDecisionSummary,
  verb: "approved" | "rejected",
): { ok: boolean; message: string } {
  if (result.succeeded === 0 && result.failed > 0) {
    return {
      ok: false,
      message:
        result.errors[0] ??
        `Could not ${verb === "approved" ? "approve" : "reject"} the selected requests.`,
    };
  }
  if (result.failed > 0) {
    return {
      ok: true,
      message: `${result.succeeded} ${verb}, ${result.failed} failed.${
        result.errors[0] ? ` ${result.errors[0]}` : ""
      }`,
    };
  }
  return {
    ok: true,
    message: `${result.succeeded} request${result.succeeded === 1 ? "" : "s"} ${verb}.`,
  };
}
