"use client";

import {
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  FileText,
  Megaphone,
  Shield,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/select";
import type { CompanyAnnouncementIconKey } from "@/types/company-announcement";

export const COMPANY_ANNOUNCEMENT_ICON_OPTIONS: Array<{
  value: CompanyAnnouncementIconKey;
  label: string;
  icon: LucideIcon;
}> = [
  { value: "megaphone", label: "Notice", icon: Megaphone },
  { value: "users", label: "Everyone", icon: Users },
  { value: "building", label: "Office", icon: Building2 },
  { value: "user", label: "Person", icon: UserRound },
  { value: "file-text", label: "Policy", icon: FileText },
  { value: "wallet", label: "Payroll", icon: Wallet },
  { value: "shield", label: "Compliance", icon: Shield },
  { value: "calendar", label: "Holiday", icon: CalendarDays },
  { value: "bell", label: "Alert", icon: Bell },
  { value: "briefcase", label: "HR", icon: Briefcase },
];

const ICON_MAP = Object.fromEntries(
  COMPANY_ANNOUNCEMENT_ICON_OPTIONS.map((item) => [item.value, item.icon]),
) as Record<CompanyAnnouncementIconKey, LucideIcon>;

export const AUDIENCE_ICONS: Record<string, LucideIcon> = {
  all_employees: Users,
  department: Building2,
  employees: UserRound,
};

export function CompanyAnnouncementIcon({
  iconKey,
  className,
}: {
  iconKey?: string | null;
  className?: string;
}) {
  const Icon = (iconKey && ICON_MAP[iconKey as CompanyAnnouncementIconKey]) || Megaphone;
  return <Icon className={className} />;
}

export function CompanyAnnouncementIconPicker({
  value,
  onChange,
}: {
  value: CompanyAnnouncementIconKey;
  onChange: (value: CompanyAnnouncementIconKey) => void;
}) {
  const items = COMPANY_ANNOUNCEMENT_ICON_OPTIONS.map((item) => ({
    value: item.value,
    label: item.label,
  }));

  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as CompanyAnnouncementIconKey);
      }}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {COMPANY_ANNOUNCEMENT_ICON_OPTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <SelectItem key={item.value} value={item.value}>
              <span className="flex items-center gap-2">
                <Icon className="size-4 text-violet-600" />
                {item.label}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
