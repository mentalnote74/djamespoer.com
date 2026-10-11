import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('SCRUM-75 consumes the exact canonical vector asset without raster substitution', async () => {
  const svg = await readFile(
    new URL('../public/assets/brand/djamespoer.com.logo.svg', import.meta.url),
  );
  assert.equal(
    createHash('sha256').update(svg).digest('hex'),
    '9a35d8162a08aeedce028bfd487cd2eb610ee425714273ac474ca885e6e4a4a6',
  );
  assert.match(svg.toString(), /<path\b/);
  assert.doesNotMatch(svg.toString(), /<image\b|<text\b|data:image|<script\b/i);
  const styles = await readFile(
    new URL('../src/app/components/bedlam/bedlam.scss', import.meta.url),
    'utf8',
  );
  assert.match(styles, /\/assets\/brand\/djamespoer\.com\.logo\.svg/);
});
