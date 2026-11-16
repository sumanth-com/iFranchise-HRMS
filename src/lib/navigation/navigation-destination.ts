/** Skip a render-only alias; the destination retains its existing authorization. */
export function navigationDestination(href: string): string {
  return href === "/dashboard/system/organization"
    ? "/dashboard/system/organization/profile"
    : href;
}
