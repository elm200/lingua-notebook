import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deleteHistoryEntry, listHistory, saveHistoryEntries } from '../public/js/historyStore.js';
import { FakeStorage } from './helpers/fakeStorage.js';

const LESSON = {
  theme: '旅行',
  angle: '日記',
  title: 'Trip',
  text: 'I went on a trip.',
  sentences: [],
};

test('saveHistoryEntries/listHistory: 保存した件数分、新しい順で取得できる', () => {
  const storage = new FakeStorage();
  saveHistoryEntries('en', [LESSON, { ...LESSON, title: 'Trip 2' }], storage);

  const list = listHistory('en', storage);
  assert.equal(list.length, 2);
  // バッチ内はプロンプトで提示した順(=lessons配列の順)が新しい順の一覧でも維持される
  assert.equal(list[0].title, 'Trip');
  assert.equal(list[1].title, 'Trip 2');
  assert.ok(list[0].id);
  assert.equal(list[0].lang, 'en');
});

test('saveHistoryEntries: 言語ごとに別のキーへ保存され、他言語には影響しない', () => {
  const storage = new FakeStorage();
  saveHistoryEntries('en', [LESSON], storage);
  saveHistoryEntries('th', [{ ...LESSON, title: 'ทริป' }], storage);

  assert.equal(listHistory('en', storage).length, 1);
  assert.equal(listHistory('th', storage).length, 1);
  assert.equal(listHistory('th', storage)[0].title, 'ทริป');
});

test('listHistory: 未保存の言語は空配列', () => {
  const storage = new FakeStorage();
  assert.deepEqual(listHistory('fr', storage), []);
});

test('deleteHistoryEntry: idで指定したエントリのみ削除する', () => {
  const storage = new FakeStorage();
  saveHistoryEntries('en', [LESSON, { ...LESSON, title: 'Trip 2' }], storage);
  const [first, second] = listHistory('en', storage);

  deleteHistoryEntry('en', first.id, storage);

  const remaining = listHistory('en', storage);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, second.id);
});
