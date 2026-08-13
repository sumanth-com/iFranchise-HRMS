"use client";

import {
  ChevronDown,
  Loader2,
  Minus,
  Network,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { FilterSelect } from "@/components/common/filter-select";
import { Modal } from "@/components/common/modal";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { Label } from "@/components/ui/label";
import { updateHierarchyAction } from "@/lib/organization/actions";
import {
  canCreateOrganization,
  canDeleteOrganization,
  canEditOrganization,
} from "@/lib/organization/constants";
import type { HierarchyEmployee, HierarchyNode } from "@/types/organization";
import { cn } from "@/lib/utils";

const MIN_ZOOM = 0.7;
const MAX_ZOOM = 1.4;
const ZOOM_STEP = 0.1;

type Props = {
  tree: HierarchyNode[];
  employees: HierarchyEmployee[];
  permissionCodes: string[];
  /** View the chart without add, edit, or remove actions. */
  readOnly?: boolean;
  /** Compact chart for use inside another module (no page title). */
  embedded?: boolean;
  title?: string;
  description?: string;
  onSelectLeaf?: (node: HierarchyNode) => void;
};

type AddMode = "head" | "member" | null;

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

function countReports(node: HierarchyNode): number {
  let total = 0;
  function walk(n: HierarchyNode) {
    total += n.children.length;
    n.children.forEach(walk);
  }
  walk(node);
  return total;
}

function chunkNodes(nodes: HierarchyNode[], size: number) {
  const rows: HierarchyNode[][] = [];
  for (let index = 0; index < nodes.length; index += size) {
    rows.push(nodes.slice(index, index + size));
  }
  return rows;
}

function collectHeads(nodes: HierarchyNode[]): HierarchyNode[] {
  const heads: HierarchyNode[] = [];
  function walk(node: HierarchyNode) {
    if (node.children.length > 0) heads.push(node);
    node.children.forEach(walk);
  }
  nodes.forEach(walk);
  return heads;
}

function getInitials(fullName: string) {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function employeeLabel(employee: HierarchyEmployee) {
  return employee.designationTitle
    ? `${employee.fullName} · ${employee.designationTitle}`
    : `${employee.fullName} (${employee.employeeCode})`;
}

type TreeNodeProps = {
  node: HierarchyNode;
  isRoot?: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAdd: boolean;
  onFocus: (node: HierarchyNode) => void;
  onEdit: (node: HierarchyNode) => void;
  onDelete: (node: HierarchyNode) => void;
  onAddMember: (node: HierarchyNode) => void;
  onSelectLeaf?: (node: HierarchyNode) => void;
};

function TreeNode({
  node,
  isRoot = false,
  canEdit,
  canDelete,
  canAdd,
  onFocus,
  onEdit,
  onDelete,
  onAddMember,
  onSelectLeaf,
}: TreeNodeProps) {
  const hasChildren = node.children.length > 0;
  const reports = countReports(node);
  const showActions = canEdit || canDelete || canAdd;

  return (
    <li>
      <span className="scene-tree-drop" aria-hidden />
      <span className="scene-tree-arrow" aria-hidden>
        <ChevronDown className="size-3.5" strokeWidth={2.5} />
      </span>

      <div className="group relative z-10">
        <button
          type="button"
          onClick={() => {
            if (hasChildren) onFocus(node);
            else onSelectLeaf?.(node);
          }}
          className={cn(
            "flex h-[3.75rem] w-56 shrink-0 items-center gap-2 rounded-xl border bg-background px-3 text-left shadow-sm transition-colors",
            showActions && "group-hover:pr-16",
            hasChildren && "cursor-pointer",
            !hasChildren && onSelectLeaf && "cursor-pointer hover:border-primary/40",
            isRoot || hasChildren
              ? "border-primary/25 bg-primary/[0.03] hover:border-primary/40"
              : cn("border-border", !onSelectLeaf && "cursor-default"),
          )}
        >
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
              isRoot || hasChildren
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {getInitials(node.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold leading-tight">{node.fullName}</p>
            <p className="mt-0.5 truncate text-[10px] leading-tight text-muted-foreground">
              {node.designationTitle ?? node.employeeCode}
              {hasChildren ? ` · ${reports} ${reports === 1 ? "report" : "reports"}` : ""}
            </p>
          </div>
        </button>

        {showActions ? (
          <div className="absolute inset-y-0 right-1 z-20 flex items-center gap-0.5 rounded-md bg-background/95 px-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
            {canAdd ? (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="size-7"
                onClick={(event) => {
                  event.stopPropagation();
                  onAddMember(node);
                }}
                aria-label={`Add team member under ${node.fullName}`}
              >
                <UserPlus className="size-3.5" />
              </Button>
            ) : null}
            {canEdit ? (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="size-7"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit(node);
                }}
                aria-label={`Edit ${node.fullName}`}
              >
                <Pencil className="size-3.5" />
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="size-7"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(node);
                }}
                aria-label={`Remove ${node.fullName} from hierarchy`}
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {!hasChildren ? <span className="scene-tree-leaf-stem" aria-hidden /> : null}

      {hasChildren ? (
        <div className="scene-tree-children">
          {chunkNodes(node.children, 5).map((row) => (
            <ul key={row.map((child) => child.id).join("-")} className="scene-tree-row">
              {row.map((child) => (
                <TreeNode
                  key={child.id}
                  node={child}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  canAdd={canAdd}
                  onFocus={onFocus}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onAddMember={onAddMember}
                  onSelectLeaf={onSelectLeaf}
                />
              ))}
            </ul>
          ))}
        </div>
      ) : null}
    </li>
  );
}

export function HierarchyManagement({
  tree,
  employees,
  permissionCodes,
  readOnly = false,
  embedded = false,
  title = "Organization Hierarchy",
  description = "Pick a head from the list to see that person with their team.",
  onSelectLeaf,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<HierarchyNode | null>(null);
  const [deleting, setDeleting] = useState<HierarchyNode | null>(null);
  const [managerId, setManagerId] = useState<string>("none");
  const [focusId, setFocusId] = useState("");
  const [zoom, setZoom] = useState(1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [headId, setHeadId] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);

  const heads = useMemo(() => collectHeads(tree), [tree]);
  const activeFocusId = heads.some((head) => head.id === focusId)
    ? focusId
    : (heads[0]?.id ?? "");

  const visibleTree = useMemo(() => {
    if (!activeFocusId) return [];
    const focused = findNodeById(tree, activeFocusId);
    if (!focused || focused.children.length === 0) return [];
    return [focused];
  }, [activeFocusId, tree]);

  const scale = Math.min(MAX_ZOOM, Math.max(0.45, fitScale * zoom));

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    const fit = () => {
      const availableWidth = Math.max(viewport.clientWidth - 48, 1);
      const treeWidth = content.scrollWidth;
      const treeHeight = content.scrollHeight;
      if (treeWidth === 0 || treeHeight === 0) return;
      setNaturalSize((current) =>
        current.width === treeWidth && current.height === treeHeight
          ? current
          : { width: treeWidth, height: treeHeight },
      );
      const nextFit = Math.min(1, availableWidth / treeWidth);
      setFitScale((current) => (Math.abs(current - nextFit) < 0.01 ? current : nextFit));
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(viewport);
    observer.observe(content);
    return () => observer.disconnect();
  }, [visibleTree]);

  const canEdit = !readOnly && canEditOrganization(permissionCodes);
  const canDelete = !readOnly && (canDeleteOrganization(permissionCodes) || canEdit);
  const canAdd = !readOnly && (canCreateOrganization(permissionCodes) || canEdit);

  const viewItems = useMemo(
    () =>
      heads.map((head) => ({
        value: head.id,
        label: head.designationTitle
          ? `${head.fullName} · ${head.designationTitle}`
          : head.fullName,
      })),
    [heads],
  );

  const employeeOptions = useMemo(
    () =>
      employees.map((employee) => ({
        value: employee.id,
        label: employeeLabel(employee),
      })),
    [employees],
  );

  const memberOptions = useMemo(() => {
    const parent = parentId ?? headId;
    if (!parent) return employeeOptions;
    const parentNode = findNodeById(tree, parent);
    const excluded = parentNode ? collectDescendantIds(parentNode) : new Set([parent]);
    excluded.add(parent);
    return employeeOptions.filter((option) => !excluded.has(option.value));
  }, [employeeOptions, headId, parentId, tree]);

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

  const requestDelete = useCallback((node: HierarchyNode) => {
    setDeleting(node);
  }, []);

  const focusPerson = useCallback((node: HierarchyNode) => {
    if (node.children.length > 0) setFocusId(node.id);
  }, []);

  const openAddHead = useCallback(() => {
    setHeadId(null);
    setMemberId(null);
    setParentId(null);
    setAddMode("head");
  }, []);

  const openAddMember = useCallback(
    (node?: HierarchyNode) => {
      const parent = node?.id ?? activeFocusId ?? null;
      setParentId(parent);
      setMemberId(null);
      setHeadId(null);
      setAddMode("member");
    },
    [activeFocusId],
  );

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

  function confirmDelete() {
    if (!deleting) return;
    startDeleteTransition(async () => {
      const nextManagerId = deleting.reportingManagerId;

      for (const child of deleting.children) {
        const res = await updateHierarchyAction({
          employeeId: child.id,
          reportingManagerId: nextManagerId,
        });
        if (!res.success) {
          toast.error(res.message);
          return;
        }
      }

      const res = await updateHierarchyAction({
        employeeId: deleting.id,
        reportingManagerId: null,
      });
      if (!res.success) {
        toast.error(res.message);
        return;
      }

      toast.success("Removed from hierarchy");
      setDeleting(null);
      if (focusId === deleting.id) setFocusId("");
      router.refresh();
    });
  }

  function confirmAdd() {
    startTransition(async () => {
      if (addMode === "head") {
        if (!headId || !memberId) {
          toast.error("Select a head and a team member");
          return;
        }
        const headRes = await updateHierarchyAction({
          employeeId: headId,
          reportingManagerId: null,
        });
        if (!headRes.success) {
          toast.error(headRes.message);
          return;
        }
        if (memberId) {
          const memberRes = await updateHierarchyAction({
            employeeId: memberId,
            reportingManagerId: headId,
          });
          if (!memberRes.success) {
            toast.error(memberRes.message);
            return;
          }
        }
        toast.success("Head member added");
        setAddMode(null);
        setFocusId(headId);
        router.refresh();
        return;
      }

      if (!parentId || !memberId) {
        toast.error("Select a parent and a team member");
        return;
      }
      const res = await updateHierarchyAction({
        employeeId: memberId,
        reportingManagerId: parentId,
      });
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success("Team member added");
      setAddMode(null);
      setFocusId(parentId);
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col gap-4",
        embedded ? "min-h-[32rem] flex-1" : "h-[calc(100dvh-12.5rem)]",
      )}
    >
      <div className="shrink-0 space-y-3">
        {embedded ? null : (
          <div>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                <Network className="size-4 text-primary" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>
        )}
        <div className="flex items-center gap-3">
          {heads.length > 0 ? (
            <FilterSelect
              items={viewItems}
              value={activeFocusId}
              onValueChange={setFocusId}
              placeholder="Select head"
              className="min-w-0 max-w-xl flex-1"
              triggerClassName="h-10 px-3"
              contentClassName="min-w-[32rem] p-1.5"
              itemClassName="px-3 py-2.5 pr-10"
            />
          ) : (
            <div className="min-w-0 flex-1" />
          )}
          {canAdd ? (
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <Button type="button" variant="outline" className="h-9" onClick={openAddHead}>
                <Users className="mr-1.5 size-4" />
                Add head
              </Button>
              <Button type="button" className="h-9" onClick={() => openAddMember()}>
                <UserPlus className="mr-1.5 size-4" />
                Add member
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {visibleTree.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl border bg-card">
          <EmptyState
            title="No head with a team yet"
            description="Add a head and at least one team member. Heads with a team will appear in the dropdown."
          />
        </div>
      ) : (
        <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-2xl border bg-card">
          <div className="absolute right-3 top-3 z-30 flex items-center gap-1 rounded-lg border bg-background/95 p-1 shadow-sm">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="size-7"
              onClick={() => setZoom((value) => Math.max(MIN_ZOOM, +(value - ZOOM_STEP).toFixed(2)))}
              aria-label="Zoom out"
            >
              <Minus className="size-3.5" />
            </Button>
            <span className="min-w-10 text-center text-xs tabular-nums text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="size-7"
              onClick={() => setZoom((value) => Math.min(MAX_ZOOM, +(value + ZOOM_STEP).toFixed(2)))}
              aria-label="Zoom in"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>

          <div ref={viewportRef} className="absolute inset-0 overflow-auto">
            <div className="inline-flex min-w-full justify-center px-8 pb-16 pt-14">
              <div
                className="overflow-hidden"
                style={{
                  width: naturalSize.width ? Math.ceil(naturalSize.width * scale) : undefined,
                  height: naturalSize.height ? Math.ceil(naturalSize.height * scale) : undefined,
                }}
              >
                <div
                  ref={contentRef}
                  className="scene-tree"
                  style={{
                    width: "max-content",
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                  }}
                >
                  {visibleTree.map((node) => (
                    <ul key={node.id} className="scene-tree-root">
                      <TreeNode
                        node={node}
                        isRoot
                        canEdit={canEdit}
                        canDelete={canDelete}
                        canAdd={canAdd}
                        onFocus={focusPerson}
                        onEdit={openAssign}
                        onDelete={requestDelete}
                        onAddMember={openAddMember}
                        onSelectLeaf={onSelectLeaf}
                      />
                    </ul>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Assign Reporting Manager"
        description={
          selected ? `Update reporting manager for ${selected.fullName}` : undefined
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

      <Modal
        open={addMode !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !isPending) setAddMode(null);
        }}
        title={addMode === "head" ? "Add head" : "Add team member"}
        description={
          addMode === "head"
            ? "Select the head, then the first person who reports to them."
            : "Select who they report to, then the team member."
        }
        contentClassName="sm:max-w-lg"
        footer={
          <Button
            onClick={confirmAdd}
            disabled={
              isPending ||
              (addMode === "head" ? !headId || !memberId : !parentId || !memberId)
            }
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {addMode === "head" ? "Add head" : "Add member"}
          </Button>
        }
      >
        <div className="space-y-5">
          {addMode === "head" ? (
            <>
              <div className="space-y-2">
                <Label>Head</Label>
                <FilterSelect
                  items={employeeOptions}
                  value={headId ?? ""}
                  onValueChange={setHeadId}
                  placeholder="Select head"
                  triggerClassName="h-10"
                />
                <p className="text-xs text-muted-foreground">
                  This person appears at the top of the team.
                </p>
              </div>
              <div className="space-y-2">
                <Label>First team member</Label>
                <FilterSelect
                  items={memberOptions}
                  value={memberId ?? ""}
                  onValueChange={setMemberId}
                  placeholder="Select team member"
                  triggerClassName="h-10"
                />
                <p className="text-xs text-muted-foreground">
                  They will report to the head you selected.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Reports to</Label>
                <FilterSelect
                  items={employeeOptions}
                  value={parentId ?? ""}
                  onValueChange={setParentId}
                  placeholder="Select parent"
                  triggerClassName="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label>Team member</Label>
                <FilterSelect
                  items={memberOptions}
                  value={memberId ?? ""}
                  onValueChange={setMemberId}
                  placeholder="Select team member"
                  triggerClassName="h-10"
                />
              </div>
            </>
          )}
        </div>
      </Modal>

      <Modal
        open={deleting !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !isDeletePending) setDeleting(null);
        }}
        title="Remove from hierarchy?"
        description={
          deleting
            ? `This will remove "${deleting.fullName}" from the current reporting line.`
            : undefined
        }
        contentClassName="sm:max-w-md"
        footer={
          <Button
            variant="destructive"
            disabled={isDeletePending || !deleting}
            onClick={confirmDelete}
          >
            {isDeletePending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Remove
          </Button>
        }
      >
        {deleting && deleting.children.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            {deleting.children.length} direct report(s) will move up to{" "}
            {deleting.reportingManagerId ? "their manager" : "the top level"}.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Their reporting manager will be cleared. You can assign a new manager anytime.
          </p>
        )}
      </Modal>
    </div>
  );
}
