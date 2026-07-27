export type EnvironmentSnapshot = {
  environment: string;
  version: string;
  buildNumber: string;
  deploymentTime: string;
  gitCommit: string | null;
  region: string | null;
  timezone: string;
  nodeVersion: string;
  nextVersion: string;
  databaseVersion: string;
  storageStatus: string;
  emailStatus: string;
  apiStatus: string;
  readOnly: boolean;
};

export function getEnvironmentSnapshot(
  emailConfigured: boolean,
  databaseHealthy: boolean,
): EnvironmentSnapshot {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    environment: process.env.NODE_ENV ?? "development",
    version: process.env.npm_package_version ?? "0.1.0",
    buildNumber: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    deploymentTime: process.env.VERCEL_DEPLOYMENT_ID
      ? new Date().toISOString()
      : "Local development",
    gitCommit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    region: process.env.VERCEL_REGION ?? null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    nodeVersion: process.version,
    nextVersion: "15.5.21",
    databaseVersion: "PostgreSQL (Supabase)",
    storageStatus: databaseHealthy ? "Operational" : "Degraded",
    emailStatus: emailConfigured ? "Configured" : "Not configured",
    apiStatus: "Healthy",
    readOnly: isProduction,
  };
}
