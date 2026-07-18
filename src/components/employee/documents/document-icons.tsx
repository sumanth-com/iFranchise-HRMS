import {
  Award,
  Briefcase,
  Building2,
  File as FileIcon,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  GraduationCap,
  IdCard,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { EmployeeDocCategoryKey } from "@/lib/employee/documents/categories";
import { cn } from "@/lib/utils";

export const CATEGORY_META: Record<
  EmployeeDocCategoryKey,
  { icon: LucideIcon; text: string; bg: string; solid: string }
> = {
  personal: {
    icon: User,
    text: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-500/10",
    solid: "text-indigo-500",
  },
  identity: {
    icon: IdCard,
    text: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/10",
    solid: "text-sky-500",
  },
  company: {
    icon: Building2,
    text: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    solid: "text-violet-500",
  },
  payroll: {
    icon: Wallet,
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    solid: "text-emerald-500",
  },
  education: {
    icon: GraduationCap,
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    solid: "text-amber-500",
  },
  previous_employment: {
    icon: Briefcase,
    text: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10",
    solid: "text-orange-500",
  },
  certifications: {
    icon: Award,
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
    solid: "text-rose-500",
  },
  other: {
    icon: Folder,
    text: "text-slate-600 dark:text-slate-300",
    bg: "bg-slate-500/10",
    solid: "text-slate-500",
  },
};

export type FileKind = "pdf" | "image" | "word" | "excel" | "zip" | "file";

export function getFileExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

export function getFileKind(mimeType: string, fileName: string): FileKind {
  const ext = getFileExtension(fileName);
  const mime = (mimeType || "").toLowerCase();
  if (mime.includes("pdf") || ext === "pdf") return "pdf";
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) {
    return "image";
  }
  if (mime.includes("word") || ["doc", "docx"].includes(ext)) return "word";
  if (
    mime.includes("sheet") ||
    mime.includes("excel") ||
    ["xls", "xlsx", "csv"].includes(ext)
  ) {
    return "excel";
  }
  if (mime.includes("zip") || ["zip", "rar", "7z"].includes(ext)) return "zip";
  return "file";
}

export function canPreviewInline(kind: FileKind): boolean {
  return kind === "pdf" || kind === "image";
}

const FILE_KIND_META: Record<
  FileKind,
  { icon: LucideIcon; text: string; bg: string; label: string }
> = {
  pdf: { icon: FileText, text: "text-red-600 dark:text-red-400", bg: "bg-red-500/10", label: "PDF" },
  image: { icon: FileImage, text: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10", label: "Image" },
  word: { icon: FileText, text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", label: "Word" },
  excel: {
    icon: FileSpreadsheet,
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    label: "Excel",
  },
  zip: { icon: FileArchive, text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", label: "Archive" },
  file: { icon: FileIcon, text: "text-slate-600 dark:text-slate-300", bg: "bg-slate-500/10", label: "File" },
};

export function fileKindLabel(kind: FileKind): string {
  return FILE_KIND_META[kind].label;
}

export function FileThumbnail({
  mimeType,
  fileName,
  className,
  iconClassName,
}: {
  mimeType: string;
  fileName: string;
  className?: string;
  iconClassName?: string;
}) {
  const kind = getFileKind(mimeType, fileName);
  const meta = FILE_KIND_META[kind];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-lg",
        meta.bg,
        className,
      )}
    >
      <Icon className={cn(meta.text, iconClassName)} />
    </span>
  );
}
