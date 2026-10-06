import { Link, useMatches } from '@tanstack/react-router';
import { Fragment } from 'react';
import * as Breadcrumb from '@/components/ui/breadcrumb';
import { cn } from '@/lib/cn';
import { jsonObject, jsonString } from '@orbs/server/client';
import type { ComponentProps } from 'react';

interface LayoutBreadcrumbsProps extends ComponentProps<'nav'> {
  showOnlyLast?: boolean
  skipRoot?: boolean
}

interface LayoutBreadcrumbsItem {
  label: string
  url?: string
}

export function LayoutBreadcrumbs({ className, showOnlyLast = true, skipRoot = false, ...props }: LayoutBreadcrumbsProps) {
  const matches = useMatches();
  const currentMatch = matches.at(-1);
  const currentPath = currentMatch?.pathname ?? '/';
  const paths = currentPath.split('/').filter(Boolean);
  const breadcrumbMap = new Map<string, string>();
  const matchedPaths = new Set<string>();
  let customBreadcrumbs: LayoutBreadcrumbsItem[] | null = null;

  for (const match of matches) {
    matchedPaths.add(match.pathname);
    const loaderData = jsonObject.safeParse(match.loaderData);

    if (!loaderData.success) {
      continue;
    }

    const breadcrumb = loaderData.data.breadcrumb;

    const crumb = jsonString.safeParse(breadcrumb);

    if (crumb.success) {
      breadcrumbMap.set(match.pathname, crumb.data);
    }

    if (Array.isArray(breadcrumb)) {
      const items = breadcrumb.flatMap((item) => {
        if (!(item instanceof Object) || Array.isArray(item) || !Object.hasOwn(item, 'label')) {
          return [];
        }

        const label = jsonString.safeParse(item.label);

        if (!label.success) {
          return [];
        }

        const url = Object.hasOwn(item, 'url') ? jsonString.safeParse(item.url).data : undefined;
        return [{ label: label.data, url }];
      });

      if (items.length === breadcrumb.length) {
        customBreadcrumbs = items;
      }
    }
  }

  const matchedBreadcrumbs = paths
    .map((path, idx) => {
      const pathUpToIndex = `/${paths.slice(0, idx + 1).join('/')}`;
      return { pathUpToIndex, path };
    })
    .filter(({ pathUpToIndex }) => matchedPaths.has(pathUpToIndex))
    .map(({ pathUpToIndex, path }) => {
      const customLabel = breadcrumbMap.get(pathUpToIndex);
      const fallbackLabel = path.charAt(0).toUpperCase() + path.slice(1);
      return {
        href: pathUpToIndex,
        label: customLabel ?? fallbackLabel,
      };
    });

  const breadcrumbs = customBreadcrumbs
    ? customBreadcrumbs.map((breadcrumb, idx) => ({
      href: breadcrumb.url ?? matchedBreadcrumbs[idx].href,
      label: breadcrumb.label,
    }))
    : matchedBreadcrumbs;

  const filtered = skipRoot && !customBreadcrumbs ? breadcrumbs.slice(1) : breadcrumbs;
  const lastBreadcrumb = filtered.at(-1);
  const displayBreadcrumbs = showOnlyLast && lastBreadcrumb ? [lastBreadcrumb] : filtered;

  if (displayBreadcrumbs.length === 0) {
    return null;
  }

  return (
    <Breadcrumb.Breadcrumb className={cn('max-w-full', className)} {...props}>
      <Breadcrumb.BreadcrumbList className="snap-x flex-nowrap gap-1 overflow-x-auto sm:gap-1">
        {displayBreadcrumbs.map((breadcrumb, idx) => {
          const isLast = idx === displayBreadcrumbs.length - 1;
          return (
            <Fragment key={breadcrumb.href}>
              <Breadcrumb.BreadcrumbItem>
                {isLast ? (
                  <Breadcrumb.BreadcrumbPage className="truncate">{breadcrumb.label}</Breadcrumb.BreadcrumbPage>
                ) : (
                  <Breadcrumb.BreadcrumbLink asChild>
                    <Link className="truncate" to={breadcrumb.href}>
                      {breadcrumb.label}
                    </Link>
                  </Breadcrumb.BreadcrumbLink>
                )}
              </Breadcrumb.BreadcrumbItem>
              {!isLast ? <Breadcrumb.BreadcrumbSeparator /> : null}
            </Fragment>
          );
        })}
      </Breadcrumb.BreadcrumbList>
    </Breadcrumb.Breadcrumb>
  );
}
