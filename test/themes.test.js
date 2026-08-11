import { test } from 'node:test';
import assert from 'node:assert/strict';
import { THEMES } from '../public/js/themes.js';
import { ANGLES } from '../public/js/angles.js';

test('THEMES: 約100件、重複なし', () => {
  assert.ok(THEMES.length >= 90, `THEMES件数が少なすぎる: ${THEMES.length}`);
  assert.equal(new Set(THEMES).size, THEMES.length);
});

test('ANGLES: 重複のない切り口候補', () => {
  assert.ok(ANGLES.length >= 5);
  assert.equal(new Set(ANGLES).size, ANGLES.length);
});
