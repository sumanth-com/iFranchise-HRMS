# =============================================================================
# iFranchise HRMS — Initialization Script (PowerShell)
# =============================================================================

param(
  [string]$SuperAdminEmail = $env:HRMS_SUPER_ADMIN_EMAIL,
  [string]$FirstName = "Super",
  [string]$LastName = "Admin",
  [string]$EmployeeCode = "EMP-0001",
  [switch]$ResetDatabase
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Push-Location $ProjectRoot

try {
  if ($ResetDatabase) {
    Write-Host "Applying all migrations and seeds (supabase db reset)..." -ForegroundColor Cyan
    npx supabase db reset
  } else {
    Write-Host "Applying pending migrations (supabase db push)..." -ForegroundColor Cyan
    npx supabase db push
  }

  $status = npx supabase db query --local "SELECT hrms.get_bootstrap_status();" 2>&1
  Write-Host $status

  if (-not $SuperAdminEmail) {
    $SuperAdminEmail = Read-Host "Enter Super Admin email (must exist in Supabase Auth)"
  }

  if ([string]::IsNullOrWhiteSpace($SuperAdminEmail)) {
    throw "Super Admin email is required. Set HRMS_SUPER_ADMIN_EMAIL or pass -SuperAdminEmail."
  }

  $escapedEmail = $SuperAdminEmail.Replace("'", "''")
  $initSql = "SELECT hrms.initialize_super_admin('$escapedEmail', '$FirstName', '$LastName', '$EmployeeCode'); SELECT hrms.get_bootstrap_status();"

  Write-Host "Initializing Super Admin for: $SuperAdminEmail" -ForegroundColor Cyan
  npx supabase db query --local $initSql

  Write-Host "HRMS initialization complete." -ForegroundColor Green
  Write-Host "If auth user was missing, invite them first:" -ForegroundColor Yellow
  Write-Host "  npx supabase auth admin invite-user --email $SuperAdminEmail" -ForegroundColor Yellow
}
finally {
  Pop-Location
}
