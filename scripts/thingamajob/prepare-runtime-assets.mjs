import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, relative, join } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const target = resolve(root, 'dist/thingamajob-runtime/browser');
const protectedAssets = resolve(root, 'dist/thingamajob-test/browser');
const sandboxAssets = resolve(root, 'dist/thingamajob-sandbox/browser');
if (!existsSync(protectedAssets) || !existsSync(sandboxAssets))
  throw Error('Build both hosts first.');
// Only replace this build's generated output, never source or private data.
if (relative(root, target).startsWith('..') || target === root) throw Error('Unsafe output path.');
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(protectedAssets, target, { recursive: true });
cpSync(sandboxAssets, join(target, 'sandbox'), { recursive: true });
console.log('Prepared protected host and portable evaluator sandbox assets.');
