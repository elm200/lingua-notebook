import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getHeaderConfig } from '../public/js/header.js';

test('getHeaderConfig: 未知のパスは先頭ページ(テキスト生成)を現在地扱いにする', () => {
  const config = getHeaderConfig('/unknown.html');
  assert.equal(config.navItems[0].current, true);
  assert.ok(config.navItems.every((item, i) => (i === 0 ? item.current : !item.current)));
});

test('getHeaderConfig: パスに一致するナビ項目がcurrentになる', () => {
  const config = getHeaderConfig('/words.html');
  const current = config.navItems.find((item) => item.current);
  assert.equal(current?.path, '/words.html');
});

test('getHeaderConfig: 3ページ分のナビ項目を持つ', () => {
  const config = getHeaderConfig('/index.html');
  assert.equal(config.navItems.length, 3);
  assert.deepEqual(
    config.navItems.map((i) => i.path),
    ['/index.html', '/history.html', '/words.html'],
  );
});
