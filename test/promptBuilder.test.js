import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BATCH_SIZE,
  buildPrompt,
  extractJson,
  parseBatchResponse,
  pickRandomBatch,
} from '../public/js/promptBuilder.js';
import { THEMES } from '../public/js/themes.js';
import { ANGLES } from '../public/js/angles.js';

const LANG = { code: 'en', label: '英語', promptName: '英語 (English)' };

test('pickRandomBatch: 既定でBATCH_SIZE件返し、テーマ・切り口とも重複しない', () => {
  const items = pickRandomBatch(THEMES, ANGLES, BATCH_SIZE);
  assert.equal(items.length, BATCH_SIZE);
  assert.equal(new Set(items.map((i) => i.theme)).size, BATCH_SIZE);
  assert.equal(new Set(items.map((i) => i.angle)).size, BATCH_SIZE);
  for (const item of items) {
    assert.ok(THEMES.includes(item.theme));
    assert.ok(ANGLES.includes(item.angle));
  }
});

test('pickRandomBatch: count > pool.lengthでも指定件数を返す', () => {
  const items = pickRandomBatch(['a', 'b'], ['x', 'y'], 5);
  assert.equal(items.length, 5);
});

test('buildPrompt: 言語名と件数、テーマ・切り口の一覧を含む', () => {
  const items = [
    { theme: '旅行', angle: '日記' },
    { theme: '食べ物', angle: 'SNS投稿' },
  ];
  const prompt = buildPrompt(LANG, items);
  assert.match(prompt, /英語 \(English\)/);
  assert.match(prompt, /2件/);
  assert.match(prompt, /1\. テーマ「旅行」\/ 文章の形式「日記」/);
  assert.match(prompt, /2\. テーマ「食べ物」\/ 文章の形式「SNS投稿」/);
});

test('extractJson: コードフェンス付きの出力から中身だけ取り出す', () => {
  assert.equal(extractJson('```json\n{"a":1}\n```'), '{"a":1}');
});

test('extractJson: フェンスが無ければそのままtrimして返す', () => {
  assert.equal(extractJson('  {"a":1}  '), '{"a":1}');
});

const VALID_LESSON = {
  title: 'Trip to the beach',
  text: 'I went to the beach.',
  sentences: [
    {
      text: 'I went to the beach.',
      translation: '私はビーチに行った。',
      grammar: '過去形の説明',
      vocab: [{ text: 'beach', meaning: 'ビーチ、浜辺' }],
    },
  ],
};

test('parseBatchResponse: {lessons:[...]}形式を items の順で対応付けて返す', () => {
  const items = [{ theme: '旅行', angle: '日記' }];
  const { entries, warnings } = parseBatchResponse(JSON.stringify({ lessons: [VALID_LESSON] }), items);
  assert.equal(warnings.length, 0);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].theme, '旅行');
  assert.equal(entries[0].angle, '日記');
  assert.equal(entries[0].title, VALID_LESSON.title);
});

test('parseBatchResponse: 裸の配列形式も受け付ける', () => {
  const items = [{ theme: '旅行', angle: '日記' }];
  const { entries } = parseBatchResponse(JSON.stringify([VALID_LESSON]), items);
  assert.equal(entries.length, 1);
});

test('parseBatchResponse: コードフェンス付きの貼り付けにも対応する', () => {
  const items = [{ theme: '旅行', angle: '日記' }];
  const raw = '```json\n' + JSON.stringify({ lessons: [VALID_LESSON] }) + '\n```';
  const { entries } = parseBatchResponse(raw, items);
  assert.equal(entries.length, 1);
});

test('parseBatchResponse: 空文字はエラー', () => {
  assert.throws(() => parseBatchResponse('', []), /空です/);
});

test('parseBatchResponse: JSONとして壊れていればエラー', () => {
  assert.throws(() => parseBatchResponse('not json', []), /解析できません/);
});

test('parseBatchResponse: lessons配列が無ければエラー', () => {
  assert.throws(() => parseBatchResponse(JSON.stringify({ foo: 'bar' }), []), /lessons配列/);
});

test('parseBatchResponse: 形式不正なlessonがあればエラー', () => {
  const raw = JSON.stringify({ lessons: [{ title: 'x' }] });
  assert.throws(() => parseBatchResponse(raw, []), /1件目/);
});

test('parseBatchResponse: 件数がitemsと食い違うと警告を出しつつ順番で対応付ける', () => {
  const items = [{ theme: '旅行', angle: '日記' }];
  const raw = JSON.stringify({ lessons: [VALID_LESSON, VALID_LESSON] });
  const { entries, warnings } = parseBatchResponse(raw, items);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].theme, '旅行');
  assert.equal(entries[1].theme, '(不明)');
  assert.equal(warnings.length, 1);
});
