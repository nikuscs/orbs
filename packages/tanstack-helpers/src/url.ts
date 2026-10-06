import type { RegisteredRouter, RouteByPath, RoutePaths } from '@tanstack/router-core';
import type { Except, JsonObject, JsonValue } from 'type-fest';

export interface TanstackUrlCanonicalParams {
  origin: string
  path: string
}

export interface TanstackUrlLocalizedPathParams {
  path: string
  locale: string
  baseLocale: string
}

export interface TanstackUrlCanonicalLocalizedParams extends TanstackUrlLocalizedPathParams {
  origin: string
}

export interface TanstackUrlLocaleAlternateParams {
  origin: string
  path: string
  locales: readonly string[]
  baseLocale: string
}

export interface TanstackUrlLocaleAlternate {
  hreflang: string
  href: string
}

export interface ResolveIntendedUrlOptions {
  intended?: string | null
  fallback?: string
}

export interface TanstackUrlCanonicalLink {
  rel: 'canonical'
  href: string
}

export interface TanstackUrlHreflangLink {
  rel: 'alternate'
  hrefLang: string
  href: string
}

type TanstackUrlParams<TPath extends RoutePaths<RegisteredRouter['routeTree']>> = RouteByPath<
  RegisteredRouter['routeTree'],
  TPath
>['types']['allParams'] extends infer Params
  ? Params extends JsonObject
    ? Params
    : JsonObject
  : JsonObject

interface TanstackUrlOptions<TPath extends RoutePaths<RegisteredRouter['routeTree']>> {
  origin: string
  to: TPath
  params?: TanstackUrlParams<TPath>
  search?: JsonObject | ((prev: JsonObject) => JsonObject)
  hash?: string
}

type TanstackUrlRuntimeSearchValue = JsonValue | undefined | (JsonValue | undefined)[]
type TanstackUrlRuntimeSearch = Record<string, TanstackUrlRuntimeSearchValue>

interface TanstackUrlRuntimeOptions {
  origin: string
  to: string
  params: JsonObject
  search: TanstackUrlRuntimeSearch | ((prev: JsonObject) => JsonObject)
  hash: string
}

/** Join origin and path, normalizing slashes. */
function joinOriginPath(origin: string, path: string): string {
  const trimmedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${trimmedOrigin}${normalizedPath}`;
}

/** Serialize a JSON-compatible value for URL params and query values. */
function stringifyUrlValue(value: JsonValue): string {
  if (value === true || value === false) {
    return String(value);
  }

  if (value === null || Array.isArray(value) || value instanceof Object) {
    return JSON.stringify(value);
  }

  return String(value);
}

/** Build a full URL from a typed TanStack route target. */
export function url<TPath extends RoutePaths<RegisteredRouter['routeTree']>>(
  options: TanstackUrlParams<TPath> extends JsonObject
    ? TanstackUrlOptions<TPath>
    : Except<TanstackUrlOptions<TPath>, 'params'> & Required<Pick<TanstackUrlOptions<TPath>, 'params'>>,
): string {
  const runtimeOptions: TanstackUrlRuntimeOptions = {
    origin: options.origin,
    to: options.to,
    params: options.params ?? {},
    search: options.search ?? {},
    hash: options.hash ?? '',
  };

  let path = runtimeOptions.to;

  for (const [key, value] of Object.entries(runtimeOptions.params)) {
    const placeholder = `$${key}`;

    if (path.includes(placeholder)) {
      path = path.replace(placeholder, encodeURIComponent(stringifyUrlValue(value)));
    }
  }

  if (path.includes('$')) {
    const missingParams = path
      .split('/')
      .filter((segment) => segment.startsWith('$'))
      .join(', ');

    throw new Error(`[tanstack-helpers] URL generation failed: Missing required parameters (${missingParams}) for pattern "${runtimeOptions.to}"`);
  }

  const resolvedSearch: TanstackUrlRuntimeSearch = runtimeOptions.search instanceof Function ? runtimeOptions.search({}) : runtimeOptions.search;
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(resolvedSearch)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== null && item !== undefined) {
          searchParams.append(key, stringifyUrlValue(item));
        }
      }
      continue;
    }

    searchParams.set(key, stringifyUrlValue(value));
  }

  const searchString = searchParams.toString();
  const hashString = runtimeOptions.hash ? `#${runtimeOptions.hash.replace(/^#/, '')}` : '';

  return `${joinOriginPath(runtimeOptions.origin, path)}${searchString ? `?${searchString}` : ''}${hashString}`;
}

export function resolveIntendedUrl(options: ResolveIntendedUrlOptions): string {
  const fallback = sanitizeRelativeUrl(options.fallback) ?? '/';
  const intended = options.intended?.trim();

  if (!intended) {
    return fallback;
  }

  return sanitizeRelativeUrl(intended) ?? fallback;
}

function sanitizeRelativeUrl(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed || !trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return null;
  }

  try {
    const parsedUrl = new URL(trimmed, 'https://app.local');

    if (parsedUrl.origin !== 'https://app.local') {
      return null;
    }

    return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  } catch {
    return null;
  }
}

/** Build canonical href from origin and a path or absolute URL. */
export function canonicalHref(params: TanstackUrlCanonicalParams): string {
  const isAbsoluteUrl = /^https?:\/\//.test(params.path);

  if (isAbsoluteUrl) {
    return params.path;
  }

  return joinOriginPath(params.origin, params.path);
}

/** Build canonical link object for TanStack Router head links. */
export function canonicalLink(params: TanstackUrlCanonicalParams): TanstackUrlCanonicalLink {
  return {
    rel: 'canonical',
    href: canonicalHref(params),
  };
}

/** Build canonical link for a localized path in one call. */
export function canonicalLocalizedLink(params: TanstackUrlCanonicalLocalizedParams): TanstackUrlCanonicalLink {
  return canonicalLink({
    origin: params.origin,
    path: localizePath({
      path: params.path,
      locale: params.locale,
      baseLocale: params.baseLocale,
    }),
  });
}

/** Build locale-aware path where base locale stays unprefixed. */
export function localizePath(params: TanstackUrlLocalizedPathParams): string {
  const normalizedPath = params.path.startsWith('/') ? params.path : `/${params.path}`;

  if (params.locale === params.baseLocale) {
    return normalizedPath;
  }

  if (normalizedPath === '/') {
    return `/${params.locale}`;
  }

  return `/${params.locale}${normalizedPath}`;
}

/** Build locale alternates for a given origin and path. */
export function getLocaleAlternates(params: TanstackUrlLocaleAlternateParams): TanstackUrlLocaleAlternate[] {
  const localeAlternates = params.locales.map((locale) => ({
    hreflang: locale,
    href: canonicalHref({
      origin: params.origin,
      path: localizePath({
        path: params.path,
        locale,
        baseLocale: params.baseLocale,
      }),
    }),
  }));

  return [
    ...localeAlternates,
    {
      hreflang: 'x-default',
      href: canonicalHref({
        origin: params.origin,
        path: localizePath({
          path: params.path,
          locale: params.baseLocale,
          baseLocale: params.baseLocale,
        }),
      }),
    },
  ];
}

/** Build hreflang link tags for TanStack Router head links. */
export function hreflangLinks(params: TanstackUrlLocaleAlternateParams): TanstackUrlHreflangLink[] {
  return getLocaleAlternates(params).map((alternate) => ({
    rel: 'alternate',
    hrefLang: alternate.hreflang,
    href: alternate.href,
  }));
}
