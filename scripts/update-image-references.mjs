#!/usr/bin/env node
/**
 * Point /images/*.jpg|jpeg|png references at matching .webp files.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOTS = ['src', 'pages.config.yml', '.pages.yml'];
const EXT_RE = /(\/images\/[^"'\s)]+)\.(jpe?g|png)/gi;

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (/\.(astro|json|md|yml|yaml|ts|css)$/.test(entry.name)) files.push(full);
  }
  return files;
}

async function collectFiles() {
  const files = [];
  for (const root of ROOTS) {
    try {
      const stat = await fs.stat(root);
      if (stat.isDirectory()) files.push(...(await walk(root)));
      else files.push(root);
    } catch {
      // optional file
    }
  }
  return files;
}

let updatedFiles = 0;
let replacements = 0;

for (const file of await collectFiles()) {
  const original = await fs.readFile(file, 'utf8');
  let count = 0;
  const next = original.replace(EXT_RE, (_match, base) => {
    count += 1;
    return `${base}.webp`;
  });
  if (count > 0) {
    await fs.writeFile(file, next);
    updatedFiles += 1;
    replacements += count;
    console.log(`${file}: ${count}`);
  }
}

console.log(`\nUpdated ${replacements} references in ${updatedFiles} files.`);
