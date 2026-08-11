import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_LANGUAGE_CODE,
  getCurrentLanguageCode,
  getLanguageByCode,
  isValidLanguageCode,
  LANGUAGES,
  setCurrentLanguageCode,
} from '../js/languages.js';
import { FakeStorage } from './helpers/fakeStorage.js';

test('LANGUAGES: 10言語(日本人に人気の指定6言語+4言語)を含む', () => {
  assert.equal(LANGUAGES.length, 10);
  const codes = LANGUAGES.map((l) => l.code);
  assert.equal(new Set(codes).size, 10);
  for (const required of ['en', 'zh', 'ko', 'es', 'th', 'vi']) {
    assert.ok(codes.includes(required), `${required} が含まれていない`);
  }
});

test('DEFAULT_LANGUAGE_CODE: 英語が既定言語', () => {
  assert.equal(DEFAULT_LANGUAGE_CODE, 'en');
  assert.ok(isValidLanguageCode(DEFAULT_LANGUAGE_CODE));
});

test('getLanguageByCode: 未知のコードは既定(先頭)言語にフォールバックする', () => {
  assert.equal(getLanguageByCode('xx').code, LANGUAGES[0].code);
});

test('getCurrentLanguageCode: 未設定時は既定言語を返す', () => {
  const storage = new FakeStorage();
  assert.equal(getCurrentLanguageCode(storage), DEFAULT_LANGUAGE_CODE);
});

test('setCurrentLanguageCode/getCurrentLanguageCode: 往復できる', () => {
  const storage = new FakeStorage();
  setCurrentLanguageCode('th', storage);
  assert.equal(getCurrentLanguageCode(storage), 'th');
});

test('setCurrentLanguageCode: 不正なコードは無視される', () => {
  const storage = new FakeStorage();
  setCurrentLanguageCode('th', storage);
  setCurrentLanguageCode('not-a-language', storage);
  assert.equal(getCurrentLanguageCode(storage), 'th');
});

test('getCurrentLanguageCode: 保存済みの値が不正ならフォールバックする', () => {
  const storage = new FakeStorage();
  storage.setItem('linguaNotebook:currentLanguage', 'xx');
  assert.equal(getCurrentLanguageCode(storage), DEFAULT_LANGUAGE_CODE);
});
