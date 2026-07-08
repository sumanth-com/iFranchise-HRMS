"use client";

import { format } from "date-fns";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { Label } from "@/components/ui/label";
import { deleteVendorAction, saveVendorAction } from "@/lib/assets/actions";
import { canCreateAssets, canDeleteAssets, canEditAssets } from "@/lib/assets/constants";
import { vendorFormSchema } from "@/lib/validations/assets";
import type { AssetVendorItem } from "@/types/assets";

type VendorFormInput = {
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
};

type Props = {
  vendors: AssetVendorItem[];
  permissionCodes: string[];
};

const emptyForm: VendorFormInput = {
  name: "",
  contactPerson: null,
  phone: null,
  email: null,
  address: null,
  notes: null,
};

export function VendorsManagement({ vendors, permissionCodes }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AssetVendorItem | null>(null);

  const canCreate = canCreateAssets(permissionCodes);
  const canEdit = canEditAssets(permissionCodes);
  const canDelete = canDeleteAssets(permissionCodes);

  const form = useForm<VendorFormInput>({
    resolver: zodResolver(vendorFormSchema) as never,
    defaultValues: emptyForm,
  });

  const openCreate = useCallback(() => {
    setEditing(null);
    form.reset(emptyForm);
    setOpen(true);
  }, [form]);

  const openEdit = useCallback(
    (item: AssetVendorItem) => {
      setEditing(item);
      form.reset({
        name: item.name,
        contactPerson: item.contactPerson,
        phone: item.phone,
        email: item.email,
        address: item.address,
        notes: item.notes,
      });
      setOpen(true);
    },
    [form],
  );

  function onSave(values: VendorFormInput) {
    startTransition(async () => {
      const res = await saveVendorAction(
        {
          ...values,
          email: values.email || null,
        },
        editing?.id,
      );
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(editing ? "Vendor updated" : "Vendor created");
      setOpen(false);
      router.refresh();
    });
  }

  const onDelete = useCallback(
    (id: string) => {
      if (!window.confirm("Delete this vendor?")) return;
      startTransition(async () => {
        const res = await deleteVendorAction(id);
        if (!res.success) {
          toast.error(res.message);
          return;
        }
        toast.success("Vendor deleted");
        router.refresh();
      });
    },
    [router],
  );

  const columns = useMemo<DataTableColumn<AssetVendorItem & Record<string, unknown>>[]>(
    () => [
      {
        key: "name",
        header: "Vendor",
        render: (row) => (
          <div>
            <p className="font-medium">{row.name}</p>
            {row.contactPerson ? (
              <p className="text-xs text-muted-foreground">{row.contactPerson}</p>
            ) : null}
          </div>
        ),
      },
      {
        key: "phone",
        header: "Contact",
        render: (row) => (
          <div>
            <p className="text-sm">{row.phone ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{row.email ?? ""}</p>
          </div>
        ),
      },
      {
        key: "purchasedAssetsCount",
        header: "Assets",
        render: (row) => row.purchasedAssetsCount,
      },
      {
        key: "updatedAt",
        header: "Updated",
        render: (row) => format(new Date(row.updatedAt), "dd MMM yyyy"),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex gap-1">
            {canEdit ? (
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => openEdit(row)}
                aria-label="Edit"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => onDelete(row.id)}
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canDelete, canEdit, onDelete, openEdit],
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage suppliers and service vendors for company assets.
          </p>
        </div>
        {canCreate ? (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Vendor
          </Button>
        ) : null}
      </div>

      {vendors.length === 0 ? (
        <EmptyState title="No vendors" description="Add a vendor to track purchases and repairs." />
      ) : (
        <DataTable columns={columns} data={vendors} />
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Vendor" : "Add Vendor"}
        contentClassName="sm:max-w-lg"
        footer={
          <Button onClick={form.handleSubmit(onSave)} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Vendor
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input {...form.register("name")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input {...form.register("contactPerson")} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input {...form.register("phone")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" {...form.register("email")} />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <textarea
              className="min-h-16 w-full rounded-md border bg-background px-3 py-2 text-sm"
              {...form.register("address")}
            />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <textarea
              className="min-h-16 w-full rounded-md border bg-background px-3 py-2 text-sm"
              {...form.register("notes")}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
