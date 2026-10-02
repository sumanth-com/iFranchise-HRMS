import "server-only";

import {
  applyIfscBranch,
  isStoredBankBranch,
} from "@/lib/payroll/services/ifsc-bank-names";
import { isValidIfsc, sanitizeIfsc } from "@/lib/onboarding/bank-field-utils";
import { createAdminClient } from "@/lib/supabase/admin";

export type IfscInstitution = {
  bankName: string;
  branchName: string;
};

const cache = new Map<string, IfscInstitution | null>();

function titleCaseBranch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b([a-z])/g, (letter) => letter.toUpperCase());
}

/** Public IFSC directory. Cached per process. Does not invent a branch when lookup fails. */
export async function lookupIfscInstitution(
  ifscCode: string | null | undefined,
): Promise<IfscInstitution | null> {
  const code = sanitizeIfsc(ifscCode ?? "");
  if (!isValidIfsc(code)) return null;
  if (cache.has(code)) return cache.get(code) ?? null;

  try {
    const response = await fetch(`https://ifsc.razorpay.com/${code}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) {
      cache.set(code, null);
      return null;
    }
    const body = (await response.json()) as { BANK?: string; BRANCH?: string };
    const branchName = titleCaseBranch(body.BRANCH ?? "");
    const bankName = (body.BANK ?? "").trim();
    if (!branchName) {
      cache.set(code, null);
      return null;
    }
    const result = { bankName, branchName };
    cache.set(code, result);
    return result;
  } catch (error) {
    console.error("[ifsc-branch] lookup failed", code, error);
    return null;
  }
}

/** Writes a branch only when the saved value is still empty. */
export async function persistMissingBankBranch(
  bankAccountId: string,
  branchName: string,
): Promise<void> {
  const branch = branchName.trim();
  if (!bankAccountId || !branch) return;
  try {
    const { error } = await createAdminClient()
      .schema("hrms")
      .from("bank_accounts")
      .update({
        branch_name: branch,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bankAccountId)
      .or("branch_name.is.null,branch_name.eq.");
    if (error) console.error("[ifsc-branch] persist failed", error.message);
  } catch (error) {
    console.error("[ifsc-branch] persist failed", error);
  }
}

export async function resolveMissingBankBranch<
  T extends {
    bankName?: string | null;
    ifscCode?: string | null;
    branchName?: string | null;
  },
>(bank: T, options?: { bankAccountId?: string | null }): Promise<T> {
  if (isStoredBankBranch(bank.branchName)) {
    return applyIfscBranch(bank, null);
  }
  const lookedUp = await lookupIfscInstitution(bank.ifscCode);
  const resolved = applyIfscBranch(bank, lookedUp);
  if (
    options?.bankAccountId &&
    isStoredBankBranch(resolved.branchName) &&
    !isStoredBankBranch(bank.branchName)
  ) {
    void persistMissingBankBranch(options.bankAccountId, resolved.branchName ?? "");
  }
  return resolved;
}
