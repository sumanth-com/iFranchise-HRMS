"use client";

import { Button } from "@/components/common/button";
import type { PolicyEmployeeCategory } from "@/lib/leave/leave-attendance-absence-policy-content";
import { cn } from "@/lib/utils";

const VARIANT_LABELS: Record<PolicyEmployeeCategory, string> = {
  full_time: "Full-Time Employee Policy",
  intern_probation: "Intern & Probation Policy",
};

export function PolicyVariantSwitcher({
  value,
  onChange,
  defaultCategory,
}: {
  value: PolicyEmployeeCategory;
  onChange: (value: PolicyEmployeeCategory) => void;
  defaultCategory?: PolicyEmployeeCategory;
}) {
  const categories: PolicyEmployeeCategory[] = ["full_time", "intern_probation"];

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        {defaultCategory
          ? `Your category: ${VARIANT_LABELS[defaultCategory]}. You may review both policies below.`
          : "Select the policy that applies to your employment category."}
      </p>
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category}
            type="button"
            size="sm"
            variant={value === category ? "default" : "outline"}
            className={cn("h-8 text-xs", value === category && "pointer-events-none")}
            onClick={() => onChange(category)}
          >
            {VARIANT_LABELS[category]}
          </Button>
        ))}
      </div>
    </div>
  );
}
