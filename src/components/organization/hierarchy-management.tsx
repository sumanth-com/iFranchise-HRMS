"use client";

import { ChevronDown, ChevronRight, Loader2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { Modal } from "@/components/common/modal";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { Label } from "@/components/ui/label";
import { updateHierarchyAction } from "@/lib/organization/actions";
import { canEditOrganization } from "@/lib/organization/constants";
import type { HierarchyEmployee, HierarchyNode } from "@/types/organization";
import { cn } from "@/lib/utils";

type Props = {
  tree: HierarchyNode[];
  employees: HierarchyEmployee[];
  permissionCodes: string[];
};

function collectDescendantIds(node: HierarchyNode): Set<string> {
  const ids = new Set<string>();
  function walk(n: HierarchyNode) {
    ids.add(n.id);
    n.children.forEach(walk);
  }
  walk(node);
  return ids;
}

function findNodeById(nodes: HierarchyNode[], id: string): HierarchyNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNodeById(node.children, id);
    if (found) return found;
  }
  return null;
}

type TreeNodeProps = {
  node: HierarchyNode;
  depth: number;
  canEdit: boolean;
  onSelect: (node: HierarchyNode) => void;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
};

function TreeNode({
  node,
  depth,
  canEdit,
  onSelect,
  expandedIds,
  onToggle,
}: TreeNodeProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 rounded-md py-1.5 pr-2 hover:bg-muted/50",
          canEdit && "cursor-pointer",
        )}
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="rounded p-0.5 hover:bg-muted"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => canEdit && onSelect(node)}
          disabled={!canEdit}
        >
          <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate font-medium">{node.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {node.employeeCode}
              {node.designationTitle ? ` · ${node.designationTitle}` : ""}
              {node.departmentName ? ` · ${node.departmentName}` : ""}
            </p>
          </div>
        </button>
      </div>
      {hasChildren && isExpanded
        ? node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              canEdit={canEdit}
              onSelect={onSelect}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))
        : null}
    </div>
  );
}

export function HierarchyManagement({ tree, employees, permissionCodes }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<HierarchyNode | null>(null);
  const [managerId, setManagerId] = useState<string>("none");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    tree.forEach((node) => ids.add(node.id));
    return ids;
  });

  const canEdit = canEditOrganization(permissionCodes);

  const managerOptions = useMemo(() => {
    if (!selected) return employees;
    const node = findNodeById(tree, selected.id);
    if (!node) return employees.filter((e) => e.id !== selected.id);
    const excluded = collectDescendantIds(node);
    return employees.filter((e) => e.id !== selected.id && !excluded.has(e.id));
  }, [employees, selected, tree]);

  const managerItems = useMemo(
    () => [
      { value: "none", label: "No manager (top level)" },
      ...managerOptions.map((emp) => ({
        value: emp.id,
        label: `${emp.fullName} (${emp.employeeCode})`,
      })),
    ],
    [managerOptions],
  );

  const openAssign = useCallback((node: HierarchyNode) => {
    setSelected(node);
    setManagerId(node.reportingManagerId ?? "none");
    setOpen(true);
  }, []);

  function onToggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onSave() {
    if (!selected) return;
    startTransition(async () => {
      const res = await updateHierarchyAction({
        employeeId: selected.id,
        reportingManagerId: managerId === "none" ? null : managerId,
      });
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success("Reporting manager updated");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Organization Hierarchy</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View reporting structure and assign managers.
          </p>
        </div>
      </div>

      {tree.length === 0 ? (
        <EmptyState
          title="No hierarchy data"
          description="Employees with reporting relationships will appear here."
        />
      ) : (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          {tree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              canEdit={canEdit}
              onSelect={openAssign}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Assign Reporting Manager"
        description={
          selected
            ? `Update reporting manager for ${selected.fullName}`
            : undefined
        }
        contentClassName="sm:max-w-md"
        footer={
          <Button onClick={onSave} disabled={isPending || !canEdit}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Reporting Manager</Label>
            <LabeledSelect
              items={managerItems}
              value={managerId}
              onValueChange={setManagerId}
              placeholder="Select manager"
              disabled={!canEdit}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
