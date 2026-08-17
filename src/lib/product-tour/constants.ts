export const TOUR_PENDING_START_KEY = "ifranchise-product-tour-pending";

export const TOUR_TARGETS = {
  sidebar: "[data-tour='sidebar']",
  topNav: "[data-tour='top-nav']",
  mainContent: "[data-tour='main-content']",
  dashboardKpis: "[data-tour='dashboard-kpis']",
  notifications: "[data-tour='notifications']",
  userMenu: "[data-tour='user-menu']",
  portalSwitcher: "[data-tour='portal-switcher']",
} as const;

export function navTourId(href: string): string {
  const slug = href
    .replace(/^\//, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "");
  return `nav-${slug}`;
}

export function navTourSelector(href: string): string {
  return `[data-tour='${navTourId(href)}']`;
}
