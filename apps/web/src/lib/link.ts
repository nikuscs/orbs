export function linkInternalPath(href: string, origin: string): string | null {
  if (href.startsWith('/') && !href.startsWith('//')) {
    return href;
  }

  const url = URL.parse(href);

  return url?.origin === origin ? `${url.pathname}${url.search}${url.hash}` : null;
}
