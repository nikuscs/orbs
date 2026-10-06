import { Errors } from '@orbs/errors/universal';
import { mkdirSync, realpathSync, rmSync } from 'node:fs';
import { mkdir, readdir, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { storageFileMissing } from '#/types/storage.types';
import { STORAGE } from './storage.constants';
import type * as StorageTypes from '#/types/storage.types';

function storageDriverPath(root: string, key: string): string {
  const segments = key === '' ? [] : key.split('/');

  if (!segments.every((segment) => STORAGE.driverKeySegment.test(segment))) {
    throw new Errors.INTERNAL_ERROR({ internal: 'Storage key is not a safe path' });
  }

  return join(root, ...segments);
}

async function storageDriverKeys(folder: string, keyPrefix: string): Promise<string[]> {
  try {
    const entries = await readdir(folder, { withFileTypes: true });

    const nested = await Promise.all(entries
      .filter((entry) => STORAGE.driverKeySegment.test(entry.name))
      .map(async (entry) => {
        if (entry.isDirectory()) {
          return storageDriverKeys(join(folder, entry.name), `${keyPrefix}${entry.name}/`);
        }

        return entry.isFile() ? [`${keyPrefix}${entry.name}`] : [];
      }));

    return nested.flat();
  } catch (error) {
    if (storageFileMissing.safeParse(error).success) {
      return [];
    }

    throw error;
  }
}

function storageDriverRollup(key: string, params: StorageTypes.StorageListParams): string[] {
  const rest = key.slice(params.prefix.length);
  const cut = params.delimiter ? rest.indexOf(params.delimiter) : -1;

  return params.delimiter && cut !== -1 ? [`${params.prefix}${rest.slice(0, cut + params.delimiter.length)}`] : [];
}

export function storageDriver(params: StorageTypes.StorageDriverParams): StorageTypes.StorageDriver {
  mkdirSync(params.root, { recursive: true });

  const root = realpathSync(params.root);
  const temp = join(root, '.tmp');

  rmSync(temp, { recursive: true, force: true });
  mkdirSync(temp);

  return {
    get: async (key) => {
      const file = Bun.file(storageDriverPath(root, key));

      return await file.exists() ? { body: file.stream() } : null;
    },
    put: async (put) => {
      const path = storageDriverPath(root, put.key);
      const staged = join(temp, crypto.randomUUID());

      try {
        await Bun.write(staged, new Response(put.body));
        await mkdir(dirname(path), { recursive: true });
        await rename(staged, path);
      } finally {
        await rm(staged, { force: true });
      }
    },
    list: async (list) => {
      const folderKey = list.prefix.slice(0, list.prefix.lastIndexOf('/') + 1);
      const keys = (await storageDriverKeys(storageDriverPath(root, folderKey.slice(0, -1)), folderKey)).filter((key) => key.startsWith(list.prefix));
      const prefixes = new Set(keys.flatMap((key) => storageDriverRollup(key, list)));
      const entries = [...keys.filter((key) => storageDriverRollup(key, list).length === 0), ...prefixes];
      const pending = entries.filter((entry) => !list.cursor || entry > list.cursor).sort();
      const page = pending.slice(0, STORAGE.driverListLimit);

      return {
        keys: page.filter((entry) => !prefixes.has(entry)),
        prefixes: page.filter((entry) => prefixes.has(entry)),
        cursor: pending.length > page.length ? page.at(-1) : undefined,
      };
    },
    removeKeys: async (keys) => {
      await Promise.all(keys.map((key) => rm(storageDriverPath(root, key), { force: true })));
    },
  };
}
