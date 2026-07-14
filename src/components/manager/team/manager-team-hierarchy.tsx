"use client";

import { ChevronDown, ChevronRight, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import type { HierarchyNode } from "@/types/organization";
import { cn } from "@/lib/utils";

type ManagerTeamHierarchyProps = {
  root: HierarchyNode | null;
  onSelectEmployee?: (node: HierarchyNode) => void;
};

type TreeNodeProps = {
  node: HierarchyNode;
  depth: number;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectEmployee?: (node: HierarchyNode) => void;
};

function TreeNode({
  node,
  depth,
  expandedIds,
  onToggle,
  onSelectEmployee,
}: TreeNodeProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-md py-1.5 pr-2 hover:bg-muted/50"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="rounded p-0.5 hover:bg-muted"
            onClick={() => onToggle(node.id)}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => onSelectEmployee?.(node)}
        >
          <Users className="size-4 shrink-0 text-muted-foreground" />
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
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelectEmployee={onSelectEmployee}
            />
          ))
        : null}
    </div>
  );
}

export function ManagerTeamHierarchy({
  root,
  onSelectEmployee,
}: ManagerTeamHierarchyProps) {
  const defaultExpanded = useMemo(() => {
    const ids = new Set<string>();
    if (root) ids.add(root.id);
    return ids;
  }, [root]);

  const [expandedIds, setExpandedIds] = useState(defaultExpanded);

  function toggle(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!root) {
    return (
      <EmptyState
        title="No reporting hierarchy"
        description="Your team hierarchy will appear here once direct reports are assigned."
      />
    );
  }

  return (
    <section className={cn("rounded-xl border bg-card p-4 shadow-sm")}>
      <div className="mb-3">
        <h2 className="text-sm font-semibold">Organization Hierarchy</h2>
        <p className="text-xs text-muted-foreground">
          Direct and indirect reports under your management.
        </p>
      </div>
      <TreeNode
        node={root}
        depth={0}
        expandedIds={expandedIds}
        onToggle={toggle}
        onSelectEmployee={onSelectEmployee}
      />
    </section>
  );
}
