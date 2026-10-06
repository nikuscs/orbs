import { BASE_LOCALE, LOCALES } from '@orbs/i18n/config';
import { canonicalHref, getLocaleAlternates, localizePath } from '@orbs/tanstack-helpers/universal';
import { SEO_DISALLOWED_PATHS, SEO_PUBLIC_PATHS } from '@/services/seo/seo.constants';

function seoEscapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export function seoBuildRobots(origin: string): string {
  const disallow = SEO_DISALLOWED_PATHS.map((path) => `Disallow: ${path}`).join('\n');

  return `User-agent: *\n${disallow}\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
}

export function seoBuildSitemap(origin: string): string {
  const entries = SEO_PUBLIC_PATHS.flatMap((path) => {
    const everyLocaleAlternate = getLocaleAlternates({
      origin,
      path,
      locales: LOCALES,
      baseLocale: BASE_LOCALE,
    });

    const links = everyLocaleAlternate
      .map((alternate) => `    <xhtml:link rel="alternate" hreflang="${alternate.hreflang}" href="${seoEscapeXml(alternate.href)}" />`)
      .join('\n');

    return LOCALES.map((locale) => {
      const href = canonicalHref({
        origin,
        path: localizePath({
          path,
          locale,
          baseLocale: BASE_LOCALE,
        }),
      });

      return `  <url>\n    <loc>${seoEscapeXml(href)}</loc>\n${links}\n  </url>`;
    });
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries}\n</urlset>\n`;
}
