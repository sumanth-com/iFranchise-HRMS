"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import {
  createAttendanceAction,
  updateAttendanceAction,
} from "@/lib/attendance/actions";
import { ATTENDANCE_ROUTES, ATTENDANCE_STATUS_LABELS } from "@/lib/attendance/constants";
import {
  extractTimeFromTimestamp,
  OFFICE_CHECK_IN_TIME,
  OFFICE_CHECK_OUT_TIME,
} from "@/lib/attendance/services/attendance-utils";
import {
  attendanceFormSchema,
  type AttendanceFormInput,
} from "@/lib/validations/attendance";
import type { AttendanceDetail, AttendanceLookups } from "@/types/attendance";

type AttendanceFormProps = {
  mode: "create" | "edit";
  attendance?: AttendanceDetail;
  lookups: AttendanceLookups;
};

export function AttendanceForm({ mode, attendance, lookups }: AttendanceFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const employeeItems = lookups.employees.map((employee) => ({
    value: employee.id,
    label: employee.code
      ? `${employee.label} (${employee.code})`
      : employee.label,
  }));

  const statusItems = Object.entries(ATTENDANCE_STATUS_LABELS).map(
    ([value, label]) => ({ value, label }),
  );

  const form = useForm<AttendanceFormInput>({
    resolver: zodResolver(attendanceFormSchema),
    defaultValues: {
      employeeId: attendance?.employeeId ?? "",
      attendanceDate:
        attendance?.attendanceDate ?? new Date().toISOString().slice(0, 10),
      checkInAt: extractTimeFromTimestamp(attendance?.checkInAt) || OFFICE_CHECK_IN_TIME,
      checkOutAt:
        extractTimeFromTimestamp(attendance?.checkOutAt) || OFFICE_CHECK_OUT_TIME,
      attendanceStatus: attendance?.attendanceStatus ?? "present",
      overtimeHours: attendance?.overtimeHours ?? 0,
      notes: attendance?.notes ?? "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createAttendanceAction(values)
          : await updateAttendanceAction(attendance!.id, values);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(
        mode === "create"
          ? "Attendance created successfully"
          : "Attendance updated successfully",
      );

      if (mode === "create" && result.data?.id) {
        router.push(ATTENDANCE_ROUTES.detail(result.data.id));
        router.refresh();
        return;
      }

      router.push(ATTENDANCE_ROUTES.detail(attendance!.id));
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="employeeId">Employee</Label>
          <Select
            items={employeeItems}
            value={form.watch("employeeId")}
            onValueChange={(value) => {
              if (!value) return;
              form.setValue("employeeId", value, { shouldValidate: true });
            }}
            disabled={mode === "edit" || isPending}
          >
            <SelectTrigger id="employeeId" className="h-8 w-full min-w-0">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              {employeeItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.employeeId ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.employeeId.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="attendanceDate">Attendance Date</Label>
          <Input
            id="attendanceDate"
            type="date"
            disabled={isPending}
            {...form.register("attendanceDate")}
          />
          {form.formState.errors.attendanceDate ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.attendanceDate.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="checkInAt">Check In</Label>
          <Input
            id="checkInAt"
            type="time"
            disabled={isPending}
            {...form.register("checkInAt")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="checkOutAt">Check Out</Label>
          <Input
            id="checkOutAt"
            type="time"
            disabled={isPending}
            {...form.register("checkOutAt")}
          />
          {form.formState.errors.checkOutAt ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.checkOutAt.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="attendanceStatus">Status</Label>
          <Select
            items={statusItems}
            value={form.watch("attendanceStatus")}
            onValueChange={(value) => {
              if (!value) return;
              form.setValue(
                "attendanceStatus",
                value as AttendanceFormInput["attendanceStatus"],
                { shouldValidate: true },
              );
            }}
            disabled={isPending}
          >
            <SelectTrigger id="attendanceStatus" className="h-8 w-full min-w-0">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              {statusItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="overtimeHours">Overtime Hours</Label>
          <Input
            id="overtimeHours"
            type="number"
            min={0}
            step="0.25"
            disabled={isPending}
            {...form.register("overtimeHours", { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Remarks</Label>
          <textarea
            id="notes"
            rows={4}
            disabled={isPending}
            className="flex min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            {...form.register("notes")}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            router.push(
              mode === "edit" && attendance
                ? ATTENDANCE_ROUTES.detail(attendance.id)
                : ATTENDANCE_ROUTES.list,
            )
          }
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {mode === "create" ? "Create attendance" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
