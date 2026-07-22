import { format, parseISO } from "date-fns";

import type { PayslipVersionItem } from "@/types/payroll";

export function PayslipVersionPanel({ versions }: { versions: PayslipVersionItem[] }) {
  if (versions.length === 0) {
    return (
      <div className="rounded-xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        No previous versions. Current payslip is the only version on record.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Version History</h2>
        <p className="text-xs text-muted-foreground">
          Previous corrected versions. Employees always see the latest version.
        </p>
      </div>
      <ul className="divide-y">
        {versions.map((version) => (
          <li key={version.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <div>
              <p className="font-medium">
                Version {version.versionNumber} · {version.payslipNumber}
              </p>
              <p className="text-xs text-muted-foreground">
                Archived{" "}
                {format(parseISO(version.createdAt), "dd MMM yyyy, HH:mm")}
              </p>
            </div>
            {version.storagePath ? (
              <span className="text-xs text-muted-foreground">PDF archived</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
