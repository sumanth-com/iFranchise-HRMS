#!/usr/bin/env bash
# =============================================================================
# iFranchise HRMS — Initialization Script (Bash)
# =============================================================================

set -euo pipefail

SUPER_ADMIN_EMAIL="${HRMS_SUPER_ADMIN_EMAIL:-}"
FIRST_NAME="${HRMS_SUPER_ADMIN_FIRST_NAME:-Super}"
LAST_NAME="${HRMS_SUPER_ADMIN_LAST_NAME:-Admin}"
EMPLOYEE_CODE="${HRMS_SUPER_ADMIN_EMPLOYEE_CODE:-EMP-0001}"
RESET_DATABASE="${HRMS_RESET_DATABASE:-false}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${PROJECT_ROOT}"

if [[ "${RESET_DATABASE}" == "true" ]]; then
  echo "Applying all migrations and seeds (supabase db reset)..."
  npx supabase db reset
else
  echo "Applying pending migrations (supabase db push)..."
  npx supabase db push
fi

npx supabase db query --local "SELECT hrms.get_bootstrap_status();"

if [[ -z "${SUPER_ADMIN_EMAIL}" ]]; then
  read -r -p "Enter Super Admin email (must exist in Supabase Auth): " SUPER_ADMIN_EMAIL
fi

if [[ -z "${SUPER_ADMIN_EMAIL}" ]]; then
  echo "Error: Super Admin email is required. Set HRMS_SUPER_ADMIN_EMAIL." >&2
  exit 1
fi

INIT_SQL="SELECT hrms.initialize_super_admin('${SUPER_ADMIN_EMAIL}', '${FIRST_NAME}', '${LAST_NAME}', '${EMPLOYEE_CODE}'); SELECT hrms.get_bootstrap_status();"

echo "Initializing Super Admin for: ${SUPER_ADMIN_EMAIL}"
npx supabase db query --local "${INIT_SQL}"

echo "HRMS initialization complete."
echo "If auth user was missing, invite them first:"
echo "  npx supabase auth admin invite-user --email ${SUPER_ADMIN_EMAIL}"
