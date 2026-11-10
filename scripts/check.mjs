#!/usr/bin/env node
/**
 * Fast, dependency-free static checks for FALESC.
 *
 * Checks:
 *  - every first-party .js/.mjs file parses as an ES module;
 *  - relative imports resolve to a file on disk;
 *  - the import map in index.html points at local files that exist;
 *  - no first-party source references a remote http(s) URL.
 *
 * This is intentionally not a bundler or a linter. Run the browser smoke test
 * (see docs/testing.md) for runtime coverage.
 */
import { spawnSync } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SKIP_DIRS = new Set(['node_modules', '.git', '.artifacts', 'vendor', 'coverage', 'dist']);
const SOURCE_EXTENSIONS = new Set(['.js', '.mjs']);
const errors = [];
const warnings = [];
let fileCount = 0;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) await walk(fullPath);
    } else if (entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name))) {
      await checkFile(fullPath);
    }
  }
}

async function exists(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function resolveImport(specifier, fromFile) {
  const base = resolve(dirname(fromFile), specifier);
  const candidates = [base, `${base}.js`, `${base}.mjs`, join(base, 'index.js')];
  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }
  return null;
}

async function checkFile(filePath) {
  fileCount += 1;
  const relative = filePath.slice(ROOT.length + 1);
  const source = await readFile(filePath, 'utf8');

  // Syntax check via Node's own parser (package.json sets "type": "module").
  const syntax = spawnSync(process.execPath, ['--check', filePath], { encoding: 'utf8' });
  if (syntax.status !== 0) {
    errors.push(`${relative}: syntax error\n${syntax.stderr.trim()}`);
    return;
  }

  // Static imports and re-exports.
  const importPattern = /(?:^|\n)\s*(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1];
    if (specifier.startsWith('node:')) continue;
    if (specifier.startsWith('.')) {
      if (!(await resolveImport(specifier, filePath))) {
        errors.push(`${relative}: cannot resolve import '${specifier}'`);
      }
    }
  }

  // Dynamic imports with string literals.
  const dynamicPattern = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (const match of source.matchAll(dynamicPattern)) {
    const specifier = match[1];
    if (specifier.startsWith('.') && !(await resolveImport(specifier, filePath))) {
      errors.push(`${relative}: cannot resolve dynamic import '${specifier}'`);
    }
  }

  // First-party code should not depend on the network at runtime.
  for (const match of source.matchAll(/https?:\/\/[^\s'"`)]+/g)) {
    if (/^https?:\/\/(localhost|127\.0\.0\.1)([:/]|$)/.test(match[0])) continue;
    if (match[0].includes('${')) continue; // template placeholder, not a real URL
    const line = source.slice(0, match.index).split('\n').length;
    warnings.push(`${relative}:${line}: remote URL ${match[0]}`);
  }
}

async function checkImportMap() {
  const html = await readFile(join(ROOT, 'index.html'), 'utf8');
  const match = html.match(/<script\b[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match) {
    errors.push('index.html: no import map found');
    return;
  }

  let importMap;
  try {
    importMap = JSON.parse(match[1]);
  } catch (error) {
    errors.push(`index.html: invalid import map JSON (${error.message})`);
    return;
  }

  for (const [specifier, target] of Object.entries(importMap.imports || {})) {
    if (/^https?:\/\//i.test(target)) {
      errors.push(`index.html: import '${specifier}' points at remote URL ${target}`);
      continue;
    }
    const resolvedTarget = target.startsWith('/')
      ? join(ROOT, target)
      : resolve(ROOT, target);
    if (!(await exists(resolvedTarget))) {
      errors.push(`index.html: import '${specifier}' target missing: ${target}`);
    }
  }
}

await walk(ROOT);
await checkImportMap();

console.log(`Checked ${fileCount} source files.`);

if (warnings.length > 0) {
  console.log(`\nWarnings (${warnings.length}):`);
  for (const warning of warnings) console.log(`  ! ${warning}`);
}

if (errors.length > 0) {
  console.error(`\nErrors (${errors.length}):`);
  for (const error of errors) console.error(`  x ${error}`);
  process.exit(1);
}

console.log('Static checks passed.');
