# HR Excel data migration (dry-run + write import)

## Safety

- `dry-run.mjs` is **read-only**.
- `write-import.mjs` writes with service role using approved conservative rules.
- Backups land in `backups/` (gitignored). Audit JSON in `audit/` (gitignored).
- Never log full bank account numbers, Aadhaar, PAN, or DOB.

## Dry-run

```bash
node scripts/hr-data-migration/dry-run.mjs
```

## Write import (approved only)

```bash
node scripts/hr-data-migration/write-import.mjs
node scripts/hr-data-migration/repair-payslips.mjs   # if payslip schema repair needed
node scripts/hr-data-migration/dry-run.mjs           # verify idempotency
```

## Schema

`supabase/migrations/20260824120000_data_import_batches.sql` — apply on next DB migration deploy.
Audit for the production run was also written to local `audit/batch-*.json`.
