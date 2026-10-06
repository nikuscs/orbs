import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseSync } from 'oxc-parser';

interface Node {
  type: string
  id?: Node
  name?: string
  value?: string
  kind?: string
  source?: Node
  declaration?: Node
  declarations?: Node[]
  init?: Node
  params?: Node[]
  typeAnnotation?: Node
  returnType?: Node
  callee?: Node
  object?: Node
  property?: Node
  key?: Node
  body?: Node[]
  computed?: boolean
}

interface FileInfo {
  absolutePath: string
  relativePath: string
  source: string
  program: Node
}

interface Declaration {
  file: FileInfo
  node: Node
  name: string
  params?: Node[]
  returnType?: Node
}

type FunctionDeclaration = Declaration & {
  params: Node[]
  returnType?: Node
}

interface MatchFileNameOptions {
  file: string
  function: string
  type: string
  value?: string | string[]
}

interface TypeDefinitionOptions {
  allowReturnTypeExports?: boolean
  allowDepsInterfaces?: boolean
}

const fileCache = new Map<string, FileInfo>();

function pascalCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('');
}

function camelCase(value: string): string {
  const next = pascalCase(value);
  return `${next.charAt(0).toLowerCase()}${next.slice(1)}`;
}

export function arch() {
  return new Arch(resolveWorkspaceRoot(process.cwd()));
}

class Arch {
  constructor(private readonly root: string) {}

  expect(pattern: string) {
    return new ArchExpectation({
      root: this.root,
      pattern,
      ignores: [],
    });
  }
}

class ArchExpectation {
  constructor(private readonly cfg: { root: string, pattern: string, ignores: string[] }) {}

  ignore(ignores: string[]) {
    return new ArchExpectation({ ...this.cfg, ignores: [...this.cfg.ignores, ...ignores] });
  }

  exports() {
    return new ArchSelection(this.cfg, async () => (await this.files()).flatMap((file) => exportedDeclarations(file)));
  }

  functions() {
    return new ArchSelection(this.cfg, async () => (await this.files()).flatMap((file) => functions(file)));
  }

  types() {
    return new ArchSelection(this.cfg, async () => (await this.files()).flatMap((file) => typeDeclarations(file)));
  }

  functionsAndTypes() {
    return new ArchSelection(this.cfg, async () => [
      ...(await this.functions().items()),
      ...(await this.types().items()),
    ]);
  }

  topLevelFunctions() {
    return new ArchSelection(this.cfg, async () => (await this.files()).flatMap((file) => topLevelFunctions(file)));
  }

  fileNames() {
    return new ArchSelection(this.cfg, async () => (await this.files()).map((file) => ({ file, node: file.program, name: path.basename(file.relativePath) })));
  }

  imports() {
    return new ArchSelection(this.cfg, async () => (await this.files()).flatMap((file) => imports(file)));
  }

  dynamicImports() {
    return new ArchSelection(this.cfg, async () => (await this.files()).flatMap((file) => dynamicImports(file)));
  }

  async toContainNoFunctions() {
    const failures = (await this.topLevelFunctions().items()).map((item) => `${item.file.relativePath}: ${item.name}`);
    assertEmpty('Expected files to contain no functions.', failures);
  }

  async toOnlyHaveConstants() {
    const failures = (await this.files()).flatMap((file) => exportedDeclarations(file)
      .filter((declaration) => declaration.node.type !== 'VariableDeclaration' || declaration.node.kind !== 'const')
      .map((declaration) => `${declaration.file.relativePath}: ${declaration.name}`));

    assertEmpty('Expected files to only export constants.', failures);
  }

  async toContainNoTypeDefinitions(options: TypeDefinitionOptions = {}) {
    const failures = (await this.files()).flatMap((file) => typeDeclarations(file)
      .filter((item) => !isAllowedTypeDefinition(item, options))
      .map((item) => `${item.file.relativePath}: ${item.name}`));

    assertEmpty('Expected files to contain no type definitions.', failures);
  }

  async toBeEmpty() {
    const failures = (await this.files()).map((file) => file.relativePath);
    assertEmpty('Expected glob to match no files.', failures);
  }

  get not() {
    return {
      toUse: async (methods: string[]) => {
        const failures = (await this.files()).flatMap((file) => methods
          .filter((method) => file.source.includes(`.${method}(`))
          .map((method) => `${file.relativePath}: ${method}`));

        assertEmpty('Expected files not to use restricted methods.', failures);
      },
      toImportFrom: async (patterns: string[]) => {
        const failures = (await this.imports().items()).flatMap((item) => patterns
          .filter((pattern) => globToRegExp(pattern).test(item.name))
          .map((pattern) => `${item.file.relativePath}: ${item.name} matches ${pattern}`));

        assertEmpty('Expected files not to import from restricted paths.', failures);
      },
      toDynamicallyImportFrom: async (patterns: string[]) => {
        const failures = (await this.dynamicImports().items()).flatMap((item) => patterns
          .filter((pattern) => globToRegExp(pattern).test(item.name))
          .map((pattern) => `${item.file.relativePath}: ${item.name} matches ${pattern}`));

        assertEmpty('Expected files not to dynamically import from restricted paths.', failures);
      },
      toContain: async (substrings: string[]) => {
        const failures = (await this.files()).flatMap((file) => substrings
          .filter((substring) => file.source.includes(substring))
          .map((substring) => `${file.relativePath}: contains ${JSON.stringify(substring)}`));

        assertEmpty('Expected files not to contain restricted substrings.', failures);
      },
    };
  }

  private async files() {
    const paths = await listFiles(this.cfg.root);
    const matcher = globToRegExp(this.cfg.pattern);
    const ignoreMatchers = this.cfg.ignores.map((ignore) => globToRegExp(ignore));
    const matches = paths.filter((file) => matcher.test(file) && !ignoreMatchers.some((ignore) => ignore.test(file)));
    return Promise.all(matches.map((relativePath) => parseFile(this.cfg.root, relativePath)));
  }
}

class ArchSelection<T extends Declaration> {
  constructor(private readonly cfg: { root: string, pattern: string, ignores: string[] }, private readonly load: () => Promise<T[]>) {}

  async items() {
    return this.load();
  }

  async toStartWith(prefix: string) {
    assertEmpty(`Expected names to start with ${prefix}.`, (await this.items())
      .filter((item) => !item.name.startsWith(prefix))
      .map(formatDeclaration));
  }

  async toStartWithFilePrefix() {
    const failures = (await this.items())
      .filter((item) => !nameMatchesFilePrefix(item.name, item.file.relativePath))
      .map((item) => `${item.file.relativePath}: ${item.name} (expected prefix: ${filePrefix(item.file.relativePath)})`);

    assertEmpty('Expected exports to start with their file prefix.', failures);
  }

  async toOnlyMatch(pattern: RegExp) {
    assertEmpty(`Expected names to match ${pattern}.`, (await this.items())
      .filter((item) => !pattern.test(item.name))
      .map(formatDeclaration));
  }

  async toMatchFileName(options: MatchFileNameOptions) {
    const failures = (await this.items()).filter((item) => {
      const domain = domainFromFile(item.file.relativePath, options.file);

      if (!domain) {
        return false;
      }

      const expectedFunction = options.function.replace('{Domain}', pascalCase(domain));
      const expectedType = options.type.replace('{Domain}', pascalCase(domain));

      const expectedValues = [options.value ?? []]
        .flat()
        .map((value) => value.replace('{Domain}', pascalCase(domain)).replace('{domain}', camelCase(domain)));

      return item.name !== expectedFunction && item.name !== expectedType && !expectedValues.includes(item.name);
    }).map(formatDeclaration);

    assertEmpty('Expected exports to match their file name.', failures);
  }

  async toMatchActionFileName() {
    assertEmpty('Expected action file names to match {domain}-action.{verb}.ts.', (await this.items())
      .filter((item) => !/^[a-z0-9]+(?:-[a-z0-9]+)*-action\.[a-z0-9]+(?:[-.][a-z0-9]+)*\.ts$/.test(item.name))
      .map(formatDeclaration));
  }

  async toMatchQueryFileName() {
    assertEmpty('Expected query file names to match {domain}-query.{name}.ts.', (await this.items())
      .filter((item) => !/^[a-z0-9]+(?:-[a-z0-9]+)*-query\.[a-z0-9]+(?:[-.][a-z0-9]+)*\.ts$/.test(item.name))
      .map(formatDeclaration));
  }

  async toOnlyAcceptObjectParams() {
    const functionItems = (await this.items()).flatMap(toFunctionDeclaration);

    const failures = functionItems
      .filter((item) => item.params.length > 1 || item.params.some((param) => !isObjectParam(param)))
      .map(formatDeclaration);

    assertEmpty('Expected functions to only accept object params.', failures);
  }

  async toContainNoInlineTypes() {
    const functionItems = (await this.items()).flatMap(toFunctionDeclaration);

    const failures = functionItems
      .filter((item) => item.params.some(hasInlineType) || hasInlineType(item.returnType))
      .map(formatDeclaration);

    assertEmpty('Expected functions to contain no inline types.', failures);
  }

  async toOnlyExport(templates: string[]) {
    const byFile = groupByFile(await this.items());
    const failures: string[] = [];

    for (const { file, decls } of byFile.values()) {
      const domain = path.basename(file.relativePath).split('.')[0] ?? '';

      const allowed = templates.map((template) => template
        .replace('{Domain}', pascalCase(domain))
        .replace('{domain}', camelCase(domain)));

      for (const decl of decls) {
        if (!allowed.includes(decl.name)) {
          failures.push(`${file.relativePath}: ${decl.name} (allowed: ${allowed.join(', ')})`);
        }
      }
    }

    assertEmpty('Expected files to only export listed names.', failures);
  }

  async toMatchFolderPrefix() {
    const seen = new Set<string>();
    const failures: string[] = [];

    for (const item of await this.items()) {
      if (seen.has(item.file.relativePath)) {
        continue;
      }
      seen.add(item.file.relativePath);

      const folder = path.basename(path.dirname(item.file.relativePath));
      const singular = folder.endsWith('s') ? folder.slice(0, -1) : folder;
      const stem = path.basename(item.file.relativePath).replace(/\.(tsx?|jsx?)$/, '');

      const matches = [
        stem === folder,
        stem === singular,
        stem.startsWith(`${folder}-`),
        stem.startsWith(`${singular}-`),
      ].some(Boolean);

      if (!matches) {
        failures.push(`${item.file.relativePath}: expected ${folder}- or ${singular}- prefix`);
      }
    }

    assertEmpty('Expected file names to start with their parent folder name (or its singular form).', failures);
  }

  async toMatchComponentExport() {
    const byFile = groupByFile(await this.items());
    const failures: string[] = [];

    for (const { file, decls } of byFile.values()) {
      const expected = pascalFromBasename(path.basename(file.relativePath));
      const components = decls.filter((decl) => isComponentLike(decl));

      if (components.length === 0) {
        continue;
      }

      const expectedKey = expected.toLowerCase();
      const exact = components.some((decl) => decl.name.toLowerCase() === expectedKey);
      const allPrefixed = components.every((decl) => decl.name.toLowerCase().startsWith(expectedKey));

      if (!exact && !allPrefixed) {
        failures.push(`${file.relativePath}: expected ${expected}* (got ${components.map((decl) => decl.name).join(', ')})`);
      }
    }

    assertEmpty('Expected component exports to match file name.', failures);
  }

  async toMatchFactoryName(fileTemplate: string, fnTemplate: string) {
    const byFile = groupByFile(await this.items());
    const failures: string[] = [];

    for (const { file, decls } of byFile.values()) {
      const groups = matchTemplate(path.basename(file.relativePath), fileTemplate);

      if (!groups) {
        continue;
      }

      const expected = fnTemplate
        .replace('{Domain}', pascalCase(groups.domain))
        .replace('{domain}', camelCase(groups.domain))
        .replace('{Name}', pascalCase(groups.name));

      if (!decls.some((decl) => decl.name === expected)) {
        failures.push(`${file.relativePath}: expected ${expected}`);
      }
    }

    assertEmpty('Expected factory exports to match file name template.', failures);
  }

  async toOnlyMatchFactoryName(fileTemplate: string, fnTemplate: string) {
    const failures: string[] = [];

    for (const item of await this.items()) {
      const groups = matchTemplate(path.basename(item.file.relativePath), fileTemplate);

      if (!groups) {
        continue;
      }

      const expected = fnTemplate
        .replace('{Domain}', pascalCase(groups.domain))
        .replace('{domain}', camelCase(groups.domain))
        .replace('{Name}', pascalCase(groups.name));

      if (item.name !== expected) {
        failures.push(`${item.file.relativePath}: ${item.name} (expected ${expected})`);
      }
    }

    assertEmpty('Expected declarations to match file factory name.', failures);
  }

  get not() {
    return new ArchExpectation(this.cfg).not;
  }
}

function exportedDeclarations(file: FileInfo): (Declaration | FunctionDeclaration)[] {
  return programBody(file).flatMap((node) => {
    if (node.type !== 'ExportNamedDeclaration' && node.type !== 'ExportDefaultDeclaration') {
      return [];
    }

    return declarationsFromNode(file, node.declaration);
  });
}

function topLevelFunctions(file: FileInfo): FunctionDeclaration[] {
  return programBody(file).flatMap((node) => functionFromNode(file, unwrapExport(node)));
}

function functions(file: FileInfo) {
  const result: FunctionDeclaration[] = [];
  visit(file.program, undefined, (node, parent) => {
    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
      result.push({
        file,
        node,
        name: nodeName(node, parent),
        params: node.params ?? [],
        returnType: node.returnType,
      });
    }
  });

  return result;
}

function typeDeclarations(file: FileInfo) {
  const result: Declaration[] = [];
  visit(file.program, undefined, (node) => {
    if (node.type === 'TSInterfaceDeclaration' || node.type === 'TSTypeAliasDeclaration') {
      result.push({
        file,
        node,
        name: node.id?.name ?? '<anonymous>',
      });
    }
  });

  return result;
}

function imports(file: FileInfo) {
  return programBody(file)
    .filter((node: Node) => node.type === 'ImportDeclaration')
    .map((node: Node) => ({ file, node, name: node.source?.value ?? '' }));
}

function dynamicImports(file: FileInfo) {
  return [...file.source.matchAll(/\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g)]
    .map((match) => ({ file, node: file.program, name: match[2] }));
}

function declarationsFromNode(file: FileInfo, node?: Node): (Declaration | FunctionDeclaration)[] {
  if (!node) {
    return [];
  }

  if (node.type === 'VariableDeclaration') {
    return (node.declarations ?? []).map((declaration) => ({ file, node, name: declaration.id?.name ?? '<anonymous>' }));
  }

  if (node.type === 'FunctionDeclaration') {
    return [{ file, node, name: node.id?.name ?? '<anonymous>', params: node.params ?? [], returnType: node.returnType }];
  }

  const name = node.id?.name;
  return name ? [{ file, node, name }] : [];
}

function functionFromNode(file: FileInfo, node?: Node): FunctionDeclaration[] {
  if (node?.type === 'FunctionDeclaration') {
    return [{ file, node, name: node.id?.name ?? '<anonymous>', params: node.params ?? [], returnType: node.returnType }];
  }

  if (node?.type === 'VariableDeclaration') {
    return (node.declarations ?? []).flatMap((declaration) => {
      if (declaration.init?.type !== 'FunctionExpression' && declaration.init?.type !== 'ArrowFunctionExpression') {
        return [];
      }

      return [{
        file,
        node: declaration.init,
        name: declaration.id?.name ?? '<anonymous>',
        params: declaration.init.params ?? [],
        returnType: declaration.init.returnType,
      }];
    });
  }

  return [];
}

function unwrapExport(node: Node) {
  return node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration' ? node.declaration : node;
}

function programBody(file: FileInfo) {
  return file.program.body ?? [];
}

function toFunctionDeclaration(item: Declaration): FunctionDeclaration[] {
  return Array.isArray(item.params) ? [{ ...item, params: item.params }] : [];
}

function nodeName(node: Node, parent?: Node) {
  if (node.id?.name) {
    return node.id.name;
  }

  if (parent?.type === 'VariableDeclarator' && parent.id?.name) {
    return parent.id.name;
  }

  if (parent?.type === 'Property' && parent.key?.name) {
    return parent.key.name;
  }

  return '<anonymous>';
}

function hasInlineType(node?: Node): boolean {
  if (!node) {
    return false;
  }

  const annotation = node.type === 'TSTypeAnnotation' ? node.typeAnnotation : node;
  return annotation?.type === 'TSTypeLiteral' || annotation?.type === 'TSFunctionType';
}

function isObjectParam(node: Node) {
  if (node.type === 'ObjectPattern') {
    return true;
  }

  const annotation = node.typeAnnotation?.typeAnnotation;
  return !annotation || annotation.type === 'TSTypeReference' || annotation.type === 'TSTypeLiteral' || annotation.type === 'TSIntersectionType';
}

function isAllowedTypeDefinition(item: Declaration, options: TypeDefinitionOptions) {
  if (options.allowDepsInterfaces && item.node.type === 'TSInterfaceDeclaration' && item.name.endsWith('Deps')) {
    return true;
  }

  return Boolean(options.allowReturnTypeExports && item.node.type === 'TSTypeAliasDeclaration' && (/(?:Service|Action|Query)$/.exec(item.name)));
}

function visit(node: Node | Node[] | null | undefined, parent: Node | undefined, cb: (node: Node, parent?: Node) => void) {
  if (!node || !(node instanceof Object)) {
    return;
  }

  if (Array.isArray(node)) {
    for (const child of node) {
      visit(child, parent, cb);
    }
    return;
  }

  if (!isNode(node)) {
    return;
  }

  if (node.type === String(node.type)) {
    cb(node, parent);
  }

  for (const [key, value] of Object.entries(node)) {
    if (key !== 'type' && key !== 'start' && key !== 'end' && key !== 'range' && key !== 'loc') {
      visit(value, node, cb);
    }
  }
}

const NODE_TYPE_KEY: keyof Node = 'type';

function isNode(value: object): value is Node {
  const typeValue = Object.getOwnPropertyDescriptor(value, NODE_TYPE_KEY)?.value;

  return Object.hasOwn(value, NODE_TYPE_KEY) && typeValue === String(typeValue);
}

async function parseFile(root: string, relativePath: string) {
  const absolutePath = path.join(root, relativePath);
  const cached = fileCache.get(absolutePath);

  if (cached) {
    return cached;
  }

  const source = await fs.readFile(absolutePath, 'utf8');
  const lang = absolutePath.endsWith('.tsx') ? 'tsx' : 'ts';
  const parsed = parseSync(absolutePath, source, { sourceType: 'module', lang });
  // SAFETY: oxc-parser's Program follows the same discriminated ESTree node contract traversed by these helpers.
  const file = { absolutePath, relativePath, source, program: parsed.program as Node };
  fileCache.set(absolutePath, file);

  return file;
}

async function listFiles(root: string) {
  const result: string[] = [];

  async function walk(directory: string) {
    const directories: string[] = [];

    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
        continue;
      }

      const absolutePath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        directories.push(absolutePath);
        continue;
      }

      result.push(path.relative(root, absolutePath).replaceAll(path.sep, '/'));
    }

    await Promise.all(directories.map((child) => walk(child)));
  }

  await walk(root);

  return result;
}

function globToRegExp(pattern: string) {
  let source = '';

  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    const next = pattern[i + 1];
    const afterNext = pattern[i + 2];

    if (char === '*' && next === '*' && afterNext === '/') {
      source += '(?:.*/)?';
      i += 2;
      continue;
    }

    if (char === '*' && next === '*') {
      source += '.*';
      i += 1;
      continue;
    }

    if (char === '*') {
      source += '[^/]*';
      continue;
    }

    if (char === '{') {
      const end = pattern.indexOf('}', i);

      if (end !== -1) {
        const alternatives = pattern
          .slice(i + 1, end)
          .split(',')
          .map((alt) => alt.replaceAll(/[.+^${}()|[\]\\]/g, (match) => `\\${match}`));

        source += `(?:${alternatives.join('|')})`;
        i = end;
        continue;
      }
    }

    source += /[.+^${}()|[\]\\]/.test(char) ? `\\${char}` : char;
  }

  return new RegExp(`^${source}$`);
}

function resolveWorkspaceRoot(start: string) {
  let current = start;

  while (current !== path.dirname(current)) {
    const packagePath = path.join(current, 'package.json');

    if (fsSync.existsSync(packagePath)) {
      const pkg = JSON.parse(fsSync.readFileSync(path.join(current, 'package.json'), 'utf8'));

      if (Array.isArray(pkg.workspaces)) {
        return current;
      }
    }

    current = path.dirname(current);
  }

  return start;
}

function domainFromFile(filePath: string, pattern: string) {
  const expectedSuffix = pattern.replace('{domain}', '');
  const fileName = path.basename(filePath);
  return fileName.endsWith(expectedSuffix) ? fileName.slice(0, -expectedSuffix.length) : null;
}

function filePrefix(filePath: string) {
  return path.basename(filePath).split('.')[0] ?? '';
}

function nameMatchesFilePrefix(name: string, filePath: string) {
  const prefix = filePrefix(filePath).replaceAll('-', '').toLowerCase();
  const normalized = name.replaceAll('_', '').toLowerCase();
  return normalized.startsWith(prefix);
}

function isComponentLike(decl: Declaration): boolean {
  if (!/^[A-Z][a-z]/.test(decl.name)) {
    return false;
  }

  return decl.node.type === 'FunctionDeclaration' || decl.node.type === 'VariableDeclaration';
}

function pascalFromBasename(basename: string) {
  const stem = basename.replace(/\.(tsx?|jsx?)$/, '');
  return stem
    .split(/[-.]/)
    .filter((part) => part.length > 0)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('');
}

function formatDeclaration(item: Declaration) {
  return `${item.file.relativePath}: ${item.name}`;
}

function assertEmpty(message: string, failures: string[]) {
  if (failures.length === 0) {
    return;
  }

  throw new Error(`${message}\n${failures.join('\n')}`);
}

function groupByFile<T extends Declaration>(items: T[]) {
  const result = new Map<string, { file: FileInfo, decls: T[] }>();

  for (const item of items) {
    const entry = result.get(item.file.relativePath) ?? { file: item.file, decls: [] };
    entry.decls.push(item);
    result.set(item.file.relativePath, entry);
  }

  return result;
}

function matchTemplate(basename: string, template: string): Record<string, string> | null {
  let pattern = '';
  let i = 0;

  while (i < template.length) {
    const char = template[i];

    if (char === '{') {
      const end = template.indexOf('}', i);

      if (end === -1) {
        return null;
      }

      const key = template.slice(i + 1, end);
      pattern += `(?<${key}>[a-z0-9-]+)`;
      i = end + 1;
      continue;
    }

    pattern += /[.+^${}()|[\]\\]/.test(char) ? `\\${char}` : char;
    i += 1;
  }

  const match = new RegExp(`^${pattern}$`).exec(basename);
  return match?.groups ?? null;
}
