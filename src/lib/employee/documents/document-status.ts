import type { DocumentStatus } from "@/types/documents";

/** Employee-friendly labels — "pending" in DB means uploaded, awaiting HR verification. */
export function getEmployeeDocumentStatusLabel(status: DocumentStatus): string {
  switch (status) {
    case "pending":
      return "Uploaded";
    case "verified":
      return "Verified";
    case "rejected":
      return "Rejected";
    case "expired":
      return "Expired";
  }
}

export function getEmployeeDocumentStatusClass(status: DocumentStatus): string {
  switch (status) {
    case "pending":
      return "bg-sky-500/10 text-sky-600 dark:text-sky-400";
    case "verified":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "rejected":
      return "bg-red-500/10 text-red-600 dark:text-red-400";
    case "expired":
      return "bg-slate-500/10 text-slate-600 dark:text-slate-300";
  }
}
