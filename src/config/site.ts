import { resolveAppOrigin } from "@/lib/url/app-origin";

export const siteConfig = {
  name: "iFranchise HRMS",
  description: "Enterprise Human Resource Management System",
  url: resolveAppOrigin(),
} as const;
