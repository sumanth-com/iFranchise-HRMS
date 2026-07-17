"use client";

import { ChevronRight, Network } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import type { HierarchyNode } from "@/types/organization";
import { cn } from "@/lib/utils";

type CeoOrganizationHierarchyProps = {
  roots: HierarchyNode[];
  onSelectEmployee?: (employeeId: string) => void;
};

type TreeNodeProps = {
  node: HierarchyNode;
  depth: number;
  index: number;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectEmployee?: (employeeId: string) => void;
};

function TreeNode({
  node,
  depth,
  index,
  expandedIds,
  onToggle,
  onSelectEmployee,
}: TreeNodeProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);

  return (
    <div
      className="animate-in fade-in-0 slide-in-from-left-2 fill-mode-both duration-300"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <div className="group flex items-center gap-2 rounded-md py-1.5 pr-2 pl-1 transition-colors hover:bg-muted/50">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            aria-label={isExpanded ? "Collapse" : "Expand"}
            className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronRight
              className={cn(
                "size-4 transition-transform duration-300",
                isExpanded && "rotate-90",
              )}
            />
          </button>
        ) : (
          <span className="flex size-5 shrink-0 items-center justify-center">
            <span className="size-1.5 rounded-full bg-muted-foreground/40 transition-colors group-hover:bg-primary/50" />
          </span>
        )}

        <button
          type="button"
          onClick={() => onSelectEmployee?.(node.id)}
          className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 text-left transition-transform duration-200 group-hover:translate-x-0.5"
        >
          <span className="truncate font-medium group-hover:text-primary">
            {node.fullName}
          </span>
          {node.designationTitle ? (
            <span className="truncate text-xs text-muted-foreground">
              {node.designationTitle}
            </span>
          ) : null}
        </button>
      </div>

      {hasChildren && isExpanded ? (
        <div className="ml-[13px] border-l border-dashed border-border/70 pl-3">
          {node.children.map((child, childIndex) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              index={childIndex}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelectEmployee={onSelectEmployee}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CeoOrganizationHierarchy({
  roots,
  onSelectEmployee,
}: CeoOrganizationHierarchyProps) {
  const defaultExpanded = useMemo(() => {
    const ids = new Set<string>();
    const addTwoLevels = (nodes: HierarchyNode[], level: number) => {
      if (level > 1) return;
      for (const node of nodes) {
        ids.add(node.id);
        addTwoLevels(node.children, level + 1);
      }
    };
    addTwoLevels(roots, 0);
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
      <div className="mb-3 flex items-center gap-2">
        <Network className="size-4 text-muted-foreground" />
        <div>
          <h2 className="text-sm font-semibold">Reporting Hierarchy</h2>
          <p className="text-xs text-muted-foreground">
            CEO → Managers → Employees · expand to explore the reporting flow.
          </p>
        </div>
      </div>
      <div className="max-h-[32rem] overflow-y-auto pr-1">
        {roots.map((root, rootIndex) => (
          <TreeNode
            key={root.id}
            node={root}
            depth={0}
            index={rootIndex}
            expandedIds={expandedIds}
            onToggle={toggle}
            onSelectEmployee={onSelectEmployee}
          />
        ))}
      </div>
    </section>
  );
}
