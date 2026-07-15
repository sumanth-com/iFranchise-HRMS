"use client";

import { ChevronDown, ChevronRight, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import type { HierarchyNode } from "@/types/organization";

type CeoOrganizationHierarchyProps = {
  roots: HierarchyNode[];
  onSelectEmployee?: (employeeId: string) => void;
};

type TreeNodeProps = {
  node: HierarchyNode;
  depth: number;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectEmployee?: (employeeId: string) => void;
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
          onClick={() => onSelectEmployee?.(node.id)}
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

export function CeoOrganizationHierarchy({
  roots,
  onSelectEmployee,
}: CeoOrganizationHierarchyProps) {
  const defaultExpanded = useMemo(() => {
    const ids = new Set<string>();
    for (const root of roots.slice(0, 3)) ids.add(root.id);
    return ids;
  }, [roots]);

  const [expandedIds, setExpandedIds] = useState(defaultExpanded);

  function toggle(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (roots.length === 0) {
    return (
      <EmptyState
        title="No reporting hierarchy"
        description="Assign reporting managers to build the organization tree."
      />
    );
  }

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="text-sm font-semibold">Reporting Hierarchy</h2>
        <p className="text-xs text-muted-foreground">
          CEO → Managers → Employees · expand or collapse · view only
        </p>
      </div>
      <div className="max-h-[28rem] overflow-y-auto">
        {roots.map((root) => (
          <TreeNode
            key={root.id}
            node={root}
            depth={0}
            expandedIds={expandedIds}
            onToggle={toggle}
            onSelectEmployee={onSelectEmployee}
          />
        ))}
      </div>
    </section>
  );
}
