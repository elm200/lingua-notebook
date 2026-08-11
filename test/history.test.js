import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveViewMode } from '../js/history.js';

test('resolveViewMode: 検索欄が空ならbrowse', () => {
  assert.equal(resolveViewMode('', null), 'browse');
  assert.equal(resolveViewMode('   ', null), 'browse');
});

test('resolveViewMode: 検索中で未選択ならsearch', () => {
  assert.equal(resolveViewMode('hello', null), 'search');
});

test('resolveViewMode: 検索結果から選択済みならdetail', () => {
  assert.equal(resolveViewMode('hello', 'entry-1'), 'detail');
});
