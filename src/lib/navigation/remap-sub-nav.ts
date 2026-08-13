export function remapSubNavHref(href: string, fromBase: string, toBase: string): string {
  if (href === fromBase || href.startsWith(`${fromBase}/`)) {
    return `${toBase}${href.slice(fromBase.length)}`;
  }
  return href;
}

export function remapSubNavItems(
  items: ReadonlyArray<{ title: string; href: string }>,
  fromBase: string,
  toBase: string,
): Array<{ title: string; href: string }> {
  return items.map((item) => ({
    title: item.title,
    href: remapSubNavHref(item.href, fromBase, toBase),
  }));
}
