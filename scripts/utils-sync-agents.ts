#!/usr/bin/env bun
// Links CLAUDE.md to AGENTS.md and mirrors .agents/skills and .agents/agents into .claude/.

import { existsSync, lstatSync, mkdirSync, readdirSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const root = process.cwd();
const sourceRoot = join(root, '.agents');

function lstatExists(path: string) {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

function replaceWithSymlink(source: string, target: string) {
  if (!existsSync(source)) {
    throw new Error(`Missing source: ${relative(root, source)}`);
  }

  if (existsSync(target) || lstatExists(target)) {
    rmSync(target, { force: true, recursive: true });
  }

  mkdirSync(dirname(target), { recursive: true });
  symlinkSync(relative(dirname(target), source), target);
}

function syncDirectoryContents(sourceDir: string, targetDir: string) {
  if (existsSync(targetDir) || lstatExists(targetDir)) {
    rmSync(targetDir, { force: true, recursive: true });
  }

  if (!existsSync(sourceDir)) {
    return;
  }

  mkdirSync(targetDir, { recursive: true });

  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    replaceWithSymlink(join(sourceDir, entry.name), join(targetDir, entry.name));
  }
}

replaceWithSymlink(join(root, 'AGENTS.md'), join(root, 'CLAUDE.md'));
syncDirectoryContents(join(sourceRoot, 'skills'), join(root, '.claude/skills'));
syncDirectoryContents(join(sourceRoot, 'agents'), join(root, '.claude/agents'));

console.log('Linked CLAUDE.md to AGENTS.md and synced .claude/');
