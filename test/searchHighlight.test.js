import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, formatVocab, highlightMatches, searchSentences } from '../js/searchHighlight.js';

test('escapeHtml: HTML特殊文字をエスケープする', () => {
  assert.equal(escapeHtml('<b>a & "b" \'c\'</b>'), '&lt;b&gt;a &amp; &quot;b&quot; &#39;c&#39;&lt;/b&gt;');
});

test('formatVocab: text/meaningのペア配列を整形する', () => {
  assert.equal(
    formatVocab([
      { text: 'hello', meaning: 'こんにちは' },
      { text: 'world', meaning: '世界' },
    ]),
    'hello こんにちは / world 世界',
  );
});

test('formatVocab: 配列以外はエスケープなしの空文字を返す', () => {
  assert.equal(formatVocab(/** @type {any} */ (null)), '');
});

test('highlightMatches: 一致箇所をmarkで囲む(大文字小文字を区別しない)', () => {
  assert.equal(
    highlightMatches('Hello World', 'world'),
    'Hello <mark class="search-highlight">World</mark>',
  );
});

test('highlightMatches: 複数一致をすべてハイライトする', () => {
  assert.equal(
    highlightMatches('cat cat cat', 'cat'),
    '<mark class="search-highlight">cat</mark> <mark class="search-highlight">cat</mark> <mark class="search-highlight">cat</mark>',
  );
});

test('highlightMatches: queryが空ならエスケープのみ行う', () => {
  assert.equal(highlightMatches('<a>', ''), '&lt;a&gt;');
});

test('searchSentences: 各エントリのsentences[].textから部分一致検索する', () => {
  const entries = [
    {
      id: '1',
      sentences: [
        { text: 'I like coffee', translation: '', grammar: '', vocab: [] },
        { text: 'It is sunny today', translation: '', grammar: '', vocab: [] },
      ],
    },
    {
      id: '2',
      sentences: [{ text: 'Coffee is great', translation: '', grammar: '', vocab: [] }],
    },
  ];

  const hits = searchSentences(/** @type {any} */ (entries), 'coffee');
  assert.equal(hits.length, 2);
  assert.equal(hits[0].entry.id, '1');
  assert.equal(hits[0].sentenceIndex, 0);
  assert.equal(hits[1].entry.id, '2');
});

test('searchSentences: 空文字クエリは結果なし', () => {
  assert.deepEqual(searchSentences(/** @type {any} */ ([]), '  '), []);
});
