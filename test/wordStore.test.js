import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deleteWord, listWords, upsertWord } from '../js/wordStore.js';
import { FakeStorage } from './helpers/fakeStorage.js';

test('upsertWord: 新規登録できる', () => {
  const storage = new FakeStorage();
  const entry = upsertWord('en', { text: 'hello', meaning: 'こんにちは' }, storage);
  assert.equal(entry.text, 'hello');
  assert.equal(entry.lang, 'en');
  assert.equal(listWords('en', storage).length, 1);
});

test('upsertWord: 同じtextを再登録すると削除→新規登録され、常に先頭(最新)になる', () => {
  const storage = new FakeStorage();
  upsertWord('en', { text: 'hello', meaning: '古い意味' }, storage);
  upsertWord('en', { text: 'world', meaning: '世界' }, storage);
  const updated = upsertWord('en', { text: 'hello', meaning: '新しい意味' }, storage);

  const words = listWords('en', storage);
  assert.equal(words.length, 2);
  assert.equal(words[0].id, updated.id);
  assert.equal(words[0].meaning, '新しい意味');
});

test('upsertWord: replaceIdを指定した編集で、textを書き換えても1件のまま更新される', () => {
  const storage = new FakeStorage();
  const original = upsertWord('en', { text: 'hello', meaning: 'こんにちは' }, storage);
  const edited = upsertWord('en', { text: 'hi', meaning: 'やあ', replaceId: original.id }, storage);

  const words = listWords('en', storage);
  assert.equal(words.length, 1);
  assert.equal(words[0].id, edited.id);
  assert.equal(words[0].text, 'hi');
});

test('upsertWord: 言語ごとに独立している', () => {
  const storage = new FakeStorage();
  upsertWord('en', { text: 'hello' }, storage);
  upsertWord('th', { text: 'สวัสดี' }, storage);

  assert.equal(listWords('en', storage).length, 1);
  assert.equal(listWords('th', storage).length, 1);
});

test('deleteWord: idで指定した単語のみ削除する', () => {
  const storage = new FakeStorage();
  const a = upsertWord('en', { text: 'a' }, storage);
  const b = upsertWord('en', { text: 'b' }, storage);

  deleteWord('en', a.id, storage);

  const words = listWords('en', storage);
  assert.equal(words.length, 1);
  assert.equal(words[0].id, b.id);
});
