import { Errors } from '@orbs/errors/universal';

export type Factories<T> = { [K in keyof T]: (services: T) => T[K] };

export function createContainer<T extends object>(factories: Factories<T>, overrides: Partial<Factories<T>> = {}): T {
  const cache = new Map<keyof T, T[keyof T]>();
  const resolving = new Set<keyof T>();
  // SAFETY: every factory key gets a getter below before this object escapes.
  const services = {} as T;

  // SAFETY: Object.keys of Factories<T> is exactly the keys of T.
  for (const key of Object.keys(factories) as (keyof T)[]) {
    const make = overrides[key] ?? factories[key];

    Object.defineProperty(services, key, {
      get: () => {
        if (cache.has(key)) {
          return cache.get(key);
        }

        if (resolving.has(key)) {
          throw new Errors.INTERNAL_ERROR({ internal: `Service cycle: ${[...resolving, key].map(String).join(' -> ')}` });
        }

        resolving.add(key);

        try {
          cache.set(key, make(services));
        } finally {
          resolving.delete(key);
        }

        return cache.get(key);
      },
    });
  }

  return services;
}
