import { createJsonLd } from './json-ld';
import { createMetadata } from './metadata';
import { canonicalLocalizedLink, hreflangLinks } from './url';
import type { TanstackJsonLdSchema } from './json-ld';
import type { TanstackMetadata } from './metadata';
import type { TanstackUrlCanonicalLink, TanstackUrlHreflangLink } from './url';

export interface TanstackHeadParams {
  path: string
  locale?: string
  title: string
  description: string
  robots?: string
  hreflang?: boolean
  metadata?: TanstackMetadata
  schemas?: readonly TanstackJsonLdSchema[]
}

export interface TanstackHeadBuilderParams {
  origin: string
  baseLocale: string
  locales: readonly string[]
  defaults: TanstackMetadata
  resolveLocale: (locale?: string) => string
  formatOpenGraphLocale?: (locale: string) => string
}

/** Build a reusable route head function with localized canonical, hreflang, and meta. */
export function createHead(builder: TanstackHeadBuilderParams) {
  return function head(params: TanstackHeadParams) {
    const locale = builder.resolveLocale(params.locale);

    const canonical = canonicalLocalizedLink({
      origin: builder.origin,
      path: params.path,
      locale,
      baseLocale: builder.baseLocale,
    });

    const links: (TanstackUrlCanonicalLink | TanstackUrlHreflangLink)[] = [canonical];

    if (params.hreflang !== false) {
      links.push(
        ...hreflangLinks({
          origin: builder.origin,
          path: params.path,
          locales: builder.locales,
          baseLocale: builder.baseLocale,
        }),
      );
    }

    const openGraphLocale = builder.formatOpenGraphLocale?.(locale);

    const openGraph: NonNullable<TanstackMetadata['openGraph']> = {
      url: canonical.href,
      ...params.metadata?.openGraph,
    };

    if (openGraphLocale) {
      openGraph.locale = openGraphLocale;
    }

    const routeMetadata: TanstackMetadata = {
      ...params.metadata,
      title: params.title,
      description: params.description,
      openGraph,
    };

    if (params.robots !== undefined) {
      routeMetadata.robots = params.robots;
    }

    return {
      meta: createMetadata({ defaults: builder.defaults, metadata: routeMetadata }),
      links,
      scripts: params.schemas && params.schemas.length > 0
        ? [{ type: 'application/ld+json', children: createJsonLd(params.schemas) }]
        : undefined,
      canonicalHref: canonical.href,
    };
  };
}
