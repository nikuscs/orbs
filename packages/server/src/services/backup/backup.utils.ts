import { Errors } from '@repo/errors/universal';
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { chmod, lstat, mkdir, open, readdir, readFile, realpath, rename, rm, rmdir, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { pipeline } from 'node:stream/promises';
import { match } from 'ts-pattern';
import { backupManifest } from '../../types/backup.types';
import { BACKUP } from './backup.constants';
import type { BackupManifest, BackupManifestFile, BackupWalkManifest } from '../../types/backup.types';

export async function backupCanonicalRoot(path: string) {
  try {
    return await realpath(resolve(path));
  } catch (error) {
    throw match(error)
      .with({ code: 'ENOENT' }, () => new Errors.NOT_FOUND({ resource: 'backup', cause: error }))
      .otherwise(() => error);
  }
}

export async function backupCanonicalAbsent(path: string) {
  const resolved = resolve(path);
  await backupAssertAbsent(resolved);

  try {
    return join(await realpath(dirname(resolved)), basename(resolved));
  } catch (error) {
    throw match(error)
      .with({ code: 'ENOENT' }, () => new Errors.NOT_FOUND({ resource: 'backup', cause: error }))
      .otherwise(() => error);
  }
}

export function backupOutside(source: string, destination: string) {
  match(source === destination || backupContains(source, destination) || backupContains(destination, source))
    .with(true, () => {
      throw new Errors.FORBIDDEN({ internal: 'Backup paths must not overlap' });
    })
    .with(false, () => undefined)
    .exhaustive();
}

async function backupAssertAbsent(path: string) {
  try {
    await lstat(path);
  } catch (error) {
    match(error)
      .with({ code: 'ENOENT' }, () => undefined)
      .otherwise(() => {
        throw error;
      });

    return;
  }

  throw new Errors.CONFLICT({ internal: 'Backup path already exists' });
}

export async function backupAssertSource(root: string) {
  await backupAssertDirectory(root);
  await backupSerial([BACKUP.files.database, BACKUP.files.credentials], async (path) => {
    await backupAssertFile(await backupContained(root, path));
  });
  await backupAssertDirectory(await backupContained(root, BACKUP.directories.agents));
  await backupAssertDirectory(await backupContained(root, BACKUP.directories.bots));
}

export async function backupStage(destination: string) {
  await backupAssertAbsent(destination);
  const staging = join(dirname(destination), `.bots-backup-${crypto.randomUUID()}`);
  await mkdir(staging, { mode: BACKUP.modes.directory });

  return staging;
}

export async function backupPublish(staging: string, destination: string) {
  try {
    await mkdir(destination, { recursive: false, mode: BACKUP.modes.directory });
  } catch (error) {
    throw match(error)
      .with({ code: 'EEXIST' }, () => new Errors.CONFLICT({ internal: 'Backup path already exists', cause: error }))
      .otherwise(() => error);
  }

  try {
    await rename(staging, destination);
  } catch (error) {
    await rmdir(destination).catch(() => undefined);
    throw error;
  }
}

export async function backupRemoveStaging(staging: string) {
  await rm(staging, { recursive: true, force: true });
}

export async function backupPopulateCreate(root: string, staging: string) {
  await mkdir(join(staging, BACKUP.directories.data), { mode: BACKUP.modes.directory });
  await mkdir(join(staging, BACKUP.directories.agents), { mode: BACKUP.modes.directory });
  await mkdir(join(staging, BACKUP.directories.bots), { mode: BACKUP.modes.directory });
  const stores = await backupBotStores(root);

  await backupSerial([BACKUP.files.database, ...stores], async (path) => {
    await mkdir(dirname(join(staging, path)), { recursive: true, mode: BACKUP.modes.directory });
    const source = await backupContained(root, path);
    await match(path.endsWith('.json'))
      .with(true, () => backupCopyFile(source, join(staging, path)))
      .with(false, () => backupVacuum(source, join(staging, path)))
      .exhaustive();
  });

  await backupCopyFile(await backupContained(root, BACKUP.files.credentials), join(staging, BACKUP.files.credentials));

  const files = await Promise.all([BACKUP.files.database, BACKUP.files.credentials, ...stores]
    .map((path) => backupManifestEntry(path, join(staging, path))));

  const manifest: BackupWalkManifest = { files, directories: [], skipped: [] };
  const agents = await backupContained(root, BACKUP.directories.agents);
  await backupWalk(root, agents, join(staging, BACKUP.directories.agents), BACKUP.directories.agents, manifest);
  await backupWriteManifest(staging, manifest);
}

export async function backupPopulateRestore(bundle: string, staging: string) {
  const manifest = await backupReadManifest(bundle);
  await mkdir(join(staging, BACKUP.directories.data), { mode: BACKUP.modes.directory });
  await mkdir(join(staging, BACKUP.directories.agents), { mode: BACKUP.modes.directory });
  await mkdir(join(staging, BACKUP.directories.bots), { mode: BACKUP.modes.directory });

  await backupSerial([...manifest.directories].sort((left, right) => left.localeCompare(right)), async (directory) => {
    await mkdir(join(staging, backupAllowedPath(directory)), { recursive: true, mode: BACKUP.modes.directory });
  });

  await backupSerial(manifest.files, async (file) => {
    const path = backupAllowedPath(file.path);
    const source = await backupContained(bundle, path);
    await backupAssertFile(source);
    const destination = join(staging, path);
    await backupCopyFile(source, destination);
    const actual = await backupManifestEntry(path, destination);
    match(actual.size === file.size && actual.sha256 === file.sha256)
      .with(true, () => undefined)
      .with(false, () => {
        throw new Errors.VALIDATION_ERROR({
          fields: { bundle: { message: 'validation_backup_checksum' } },
        });
      })
      .exhaustive();

  });

  await backupAssertSource(staging);
}

function backupContains(root: string, path: string) {
  const inside = relative(root, path);
  return inside !== '' && inside !== '..' && !inside.startsWith(`..${sep}`) && !isAbsolute(inside);
}

function backupRelativePath(path: string) {
  const parts = path.split('/');
  match(parts.every((part) => part !== '' && part !== '.' && part !== '..'))
    .with(true, () => undefined)
    .with(false, () => {
      throw new Errors.FORBIDDEN({ internal: 'Backup path is not a safe relative path' });
    })
    .exhaustive();

  return path;
}

function backupAllowedPath(path: string) {
  const relativePath = backupRelativePath(path);
  match(
    BACKUP.botStore.test(relativePath)
    || relativePath === BACKUP.files.database
    || relativePath === BACKUP.files.credentials
    || relativePath === BACKUP.directories.agents
    || relativePath.startsWith(`${BACKUP.directories.agents}/`),
  )
    .with(true, () => undefined)
    .with(false, () => {
      throw new Errors.FORBIDDEN({ internal: 'Backup path is not part of the data root' });
    })
    .exhaustive();

  return relativePath;
}

async function backupBotStores(root: string) {
  const bots = await readdir(await backupContained(root, BACKUP.directories.bots), { withFileTypes: true });

  const files = await Promise.all(bots.filter((entry) => entry.isDirectory()).map(async (entry) => {
    const names = await readdir(join(root, BACKUP.directories.bots, entry.name));
    return names.map((name) => `${BACKUP.directories.bots}/${entry.name}/${name}`);
  }));

  return files.flat().filter((path) => BACKUP.botStore.test(path)).sort();
}

async function backupSerial<Value>(values: readonly Value[], each: (value: Value) => Promise<void>) {
  await values.reduce(async (previous, value) => {
    await previous;
    await each(value);
  }, Promise.resolve());
}

async function backupContained(root: string, relativePath: string) {
  const base = await realpath(root);

  const path = await backupRelativePath(relativePath).split('/').reduce(async (previous, part) => {
    const current = join(await previous, part);
    const stats = await lstat(current);
    match(stats.isSymbolicLink())
      .with(true, () => {
        throw new Errors.FORBIDDEN({ internal: 'Backup refuses symbolic links' });
      })
      .with(false, () => undefined)
      .exhaustive();

    return current;
  }, Promise.resolve(root));

  const actual = await realpath(path);
  match(actual === base || backupContains(base, actual))
    .with(true, () => undefined)
    .with(false, () => {
      throw new Errors.FORBIDDEN({ internal: 'Backup refuses paths outside the data root' });
    })
    .exhaustive();

  return path;
}

async function backupAssertFile(path: string) {
  try {
    const stats = await lstat(path);
    match(stats.isFile())
      .with(true, () => undefined)
      .with(false, () => {
        throw new Errors.NOT_FOUND({ resource: 'backup' });
      })
      .exhaustive();
  } catch (error) {
    throw match(error)
      .with({ code: 'ENOENT' }, () => new Errors.NOT_FOUND({ resource: 'backup', cause: error }))
      .otherwise(() => error);
  }
}

async function backupAssertDirectory(path: string) {
  try {
    const stats = await lstat(path);
    match({ isSymbolicLink: stats.isSymbolicLink(), isDirectory: stats.isDirectory() })
      .with({ isSymbolicLink: true }, () => {
        throw new Errors.FORBIDDEN({ internal: 'Backup refuses symbolic links' });
      })
      .with({ isDirectory: true }, () => undefined)
      .otherwise(() => {
        throw new Errors.NOT_FOUND({ resource: 'backup' });
      });
  } catch (error) {
    throw match(error)
      .with({ code: 'ENOENT' }, () => new Errors.NOT_FOUND({ resource: 'backup', cause: error }))
      .otherwise(() => error);
  }
}

async function backupVacuum(source: string, destination: string) {
  const database = new DatabaseSync(source);

  try {
    database.prepare('VACUUM INTO ?').run(destination);
  } finally {
    database.close();
  }

  await chmod(destination, BACKUP.modes.file);
}

async function backupCopyFile(source: string, destination: string) {
  const stats = await lstat(source);
  match({ isSymbolicLink: stats.isSymbolicLink(), isFile: stats.isFile() })
    .with({ isSymbolicLink: true }, () => {
      throw new Errors.FORBIDDEN({ internal: 'Backup refuses symbolic links' });
    })
    .with({ isFile: true }, () => undefined)
    .otherwise(() => {
      throw new Errors.FORBIDDEN({ internal: 'Backup refuses unsupported file types' });
    });

  await mkdir(dirname(destination), { recursive: true, mode: BACKUP.modes.directory });
  const from = await open(source, constants.O_RDONLY | constants.O_NOFOLLOW);

  try {
    const to = await open(destination, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, BACKUP.modes.file);

    try {
      await pipeline(from.createReadStream(), to.createWriteStream());
    } finally {
      await to.close();
    }
  } finally {
    await from.close();
  }

  await chmod(destination, stats.mode & constants.S_IXUSR ? BACKUP.modes.exec : BACKUP.modes.file);
}

async function backupManifestEntry(relativePath: string, path: string): Promise<BackupManifestFile> {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);

  try {
    const stats = await file.stat();
    const hash = createHash('sha256');
    await pipeline(file.createReadStream(), hash);

    return {
      path: backupRelativePath(relativePath),
      size: stats.size,
      sha256: hash.digest('hex'),
    };
  } finally {
    await file.close();
  }
}

async function backupWalk(
  root: string,
  source: string,
  destination: string,
  relativePath: string,
  manifest: BackupWalkManifest,
) {
  await backupSerial(await readdir(source, { withFileTypes: true }), async (entry) => {
    const next = backupAllowedPath(`${relativePath}/${entry.name}`);
    const to = join(destination, entry.name);

    await match({ isDirectory: entry.isDirectory(), isFile: entry.isFile() })
      .with({ isDirectory: true }, async () => {
        await mkdir(to, { recursive: true, mode: BACKUP.modes.directory });
        manifest.directories.push(next);
        await backupWalk(root, await backupContained(root, next), to, next, manifest);
      })
      .with({ isFile: true }, async () => {
        await backupCopyFile(await backupContained(root, next), to);
        manifest.files.push(await backupManifestEntry(next, to));
      })
      .otherwise(() => {
        manifest.skipped.push(next);
      });
  });
}

async function backupWriteManifest(directory: string, { files, directories, skipped }: BackupWalkManifest) {
  const manifest: BackupManifest = {
    version: BACKUP.version,
    createdAt: Date.now(),
    files: [...files].sort((left, right) => left.path.localeCompare(right.path)),
    directories: [...directories].sort((left, right) => left.localeCompare(right)),
    skipped: [...skipped].sort((left, right) => left.localeCompare(right)),
    excluded: BACKUP.excluded,
  };

  await writeFile(join(directory, BACKUP.manifest), `${JSON.stringify(backupManifest.parse(manifest), null, 2)}\n`, {
    mode: BACKUP.modes.file,
    flag: 'wx',
  });
}

async function backupReadManifest(directory: string) {
  try {
    const path = await backupContained(directory, BACKUP.manifest);
    await backupAssertFile(path);

    return backupManifest.parse(JSON.parse(await readFile(path, 'utf8')));
  } catch (error) {
    throw new Errors.VALIDATION_ERROR({
      fields: { bundle: { message: 'validation_backup_manifest' } },
      cause: error,
    });
  }
}
