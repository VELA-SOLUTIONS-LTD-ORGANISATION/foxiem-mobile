import fs from 'fs';
import path from 'path';

import en from '../locales/en.json';

/** Every literal `t('some.key')` in the app must resolve in the English catalogue. */

function walk(directory: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__' && entry.name !== 'locales') {
        walk(full, files);
      }
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function lookup(key: string): boolean {
  let node: unknown = en;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) {
      return false;
    }
    node = (node as Record<string, unknown>)[part];
  }
  return node !== undefined;
}

function exists(key: string): boolean {
  return lookup(key) || lookup(`${key}_one`) || lookup(`${key}_other`);
}

describe('translation keys used in source', () => {
  const root = path.join(__dirname, '..', '..');
  const files = walk(root);

  it('finds source files to scan', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('resolves every literal key', () => {
    const missing: string[] = [];
    const literal = /\bt\(\s*(['"])([A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+)\1/g;
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      for (const match of source.matchAll(literal)) {
        if (!exists(match[2]!)) {
          missing.push(`${path.relative(root, file)}: ${match[2]}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('resolves the static prefix of every templated key', () => {
    const missing: string[] = [];
    const templated = /\bt\(\s*`([A-Za-z][A-Za-z0-9_.]*)\.\$\{/g;
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      for (const match of source.matchAll(templated)) {
        if (!lookup(match[1]!)) {
          missing.push(`${path.relative(root, file)}: ${match[1]}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
