"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { submitResignationAction } from "@/lib/exit/actions";
import { EXIT_REASON_OPTIONS } from "@/lib/exit/constants";
import { addDaysIso } from "@/lib/exit/services/exit-utils";
import {
  resignationFormSchema,
  type ResignationFormValues,
} from "@/lib/validations/exit";

type Props = {
  employeeId: string;
  defaultNoticePeriodDays: number;
  redirectPath: string;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function ResignationSubmitForm({
  employeeId,
  defaultNoticePeriodDays,
  redirectPath,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const resignationDate = todayIso();

  const form = useForm<ResignationFormValues>({
    resolver: zodResolver(resignationFormSchema) as never,
    defaultValues: {
      employeeId,
      resignationDate,
      lastWorkingDay: addDaysIso(resignationDate, defaultNoticePeriodDays),
      noticePeriodDays: defaultNoticePeriodDays,
      reason: EXIT_REASON_OPTIONS[0],
      comments: null,
    },
  });

  const noticePeriodDays = form.watch("noticePeriodDays");

  return (
    <form
      className="space-y-4 rounded-xl border bg-card p-5 shadow-sm"
      onSubmit={form.handleSubmit((values) => {
        startTransition(async () => {
          const result = await submitResignationAction(values);
          if (!result.success) {
            toast.error(result.message);
            return;
          }
          toast.success("Resignation submitted");
          router.push(redirectPath);
          router.refresh();
        });
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Resignation date">
          <Input
            type="date"
            disabled={isPending}
            {...form.register("resignationDate", {
              onChange: (event) => {
                const value = event.target.value;
                form.setValue("resignationDate", value, { shouldValidate: true });
                const days = form.getValues("noticePeriodDays");
                form.setValue("lastWorkingDay", addDaysIso(value, days), {
                  shouldValidate: true,
                });
              },
            })}
          />
        </Field>
        <Field label="Notice period (days)">
          <Input
            type="number"
            min={0}
            max={365}
            disabled={isPending}
            {...form.register("noticePeriodDays", {
              valueAsNumber: true,
              onChange: (event) => {
                const days = Number(event.target.value) || 0;
                form.setValue("noticePeriodDays", days, { shouldValidate: true });
                const date = form.getValues("resignationDate");
                if (date) {
                  form.setValue("lastWorkingDay", addDaysIso(date, days), {
                    shouldValidate: true,
                  });
                }
              },
            })}
          />
        </Field>
        <Field label="Last working day" className="sm:col-span-2">
          <Input type="date" disabled={isPending} {...form.register("lastWorkingDay")} />
          <p className="text-xs text-muted-foreground">
            Suggested: resignation date + {noticePeriodDays} day notice period.
          </p>
        </Field>
        <Field label="Reason" className="sm:col-span-2">
          <LabeledSelect
            items={EXIT_REASON_OPTIONS.map((reason) => ({ value: reason, label: reason }))}
            value={form.watch("reason")}
            onValueChange={(value) => form.setValue("reason", value, { shouldValidate: true })}
            disabled={isPending}
          />
        </Field>
        <Field label="Comments (optional)" className="sm:col-span-2">
          <textarea
            className="min-h-[96px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            disabled={isPending}
            placeholder="Share any context for your manager and HR."
            {...form.register("comments")}
          />
        </Field>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Submit resignation
      </Button>
    </form>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className ? `${className} space-y-2` : "space-y-2"}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
