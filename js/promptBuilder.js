/**
 * @typedef {import('./historyStore.js').SentenceExplanation} SentenceExplanation
 * @typedef {import('./languages.js').Language} Language
 */

/** 1回のプロンプトで一気に生成するテキスト数 */
export const BATCH_SIZE = 10;

/**
 * @template T
 * @param {readonly T[]} arr
 * @returns {T[]}
 */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * poolから重複なくcount個取り出す。count > pool.lengthの場合はpoolを再シャッフルして続ける
 * (このアプリのBATCH_SIZEとpoolサイズの関係では通常起きないが、poolが将来減っても壊れないようにする)。
 * @template T
 * @param {readonly T[]} pool
 * @param {number} count
 * @returns {T[]}
 */
function sampleWithoutImmediateRepeat(pool, count) {
  /** @type {T[]} */
  const result = [];
  let shuffled = shuffle(pool);
  let idx = 0;
  while (result.length < count) {
    if (idx >= shuffled.length) {
      shuffled = shuffle(pool);
      idx = 0;
    }
    result.push(shuffled[idx]);
    idx++;
  }
  return result;
}

/**
 * @typedef {Object} BatchItem
 * @property {string} theme
 * @property {string} angle
 */

/**
 * テーマ・切り口をランダムに組み合わせたバッチ項目を作る
 * @param {readonly string[]} themes
 * @param {readonly string[]} angles
 * @param {number} [count]
 * @returns {BatchItem[]}
 */
export function pickRandomBatch(themes, angles, count = BATCH_SIZE) {
  const pickedThemes = sampleWithoutImmediateRepeat(themes, count);
  const pickedAngles = sampleWithoutImmediateRepeat(angles, count);
  return pickedThemes.map((theme, i) => ({ theme, angle: pickedAngles[i] }));
}

/**
 * 通常のAIチャットサービス(ChatGPT/Gemini等)にそのまま貼り付けられるプロンプトを組み立てる。
 * @param {Language} language
 * @param {BatchItem[]} items
 * @returns {string}
 */
export function buildPrompt(language, items) {
  const itemsList = items.map((it, i) => `${i + 1}. テーマ「${it.theme}」/ 文章の形式「${it.angle}」`).join('\n');

  return [
    `あなたは${language.promptName}の教師です。中級学習者向けの${language.promptName}学習教材を、以下の${items.length}件分まとめて作成してください。`,
    '',
    `重要: 各lessonの"title"・"text"、および各sentences[].textは必ず${language.promptName}で書いてください。日本語訳やローマ字表記を書いてはいけません。`,
    '一方、translation・grammar・vocab[].meaningは必ず日本語で書いてください。',
    '出力は必ず ```json ...内容... ``` の形式で、次のJSON形式のみをコードブロックで囲んで書いてください(コードブロックの前後に説明文を付けないでください)。',
    '{',
    '  "lessons": [',
    '    {',
    '      "title": "(本文の内容を要約する短いタイトル、5〜10語程度)",',
    '      "text": "(本文全体、200文字程度)",',
    '      "sentences": [',
    '        {',
    '          "text": "(1文目)",',
    '          "translation": "日本語訳",',
    '          "grammar": "文法解説(日本語)",',
    '          "vocab": [ { "text": "単語", "meaning": "日本語の意味" } ]',
    '        }',
    '      ]',
    '    }',
    `    // ... 以下同じ形式で合計${items.length}件`,
    '  ]',
    '}',
    `lessons配列は必ず${items.length}件、下記の「生成する${items.length}件」に列挙した順番どおりに並べてください(1番目の指定内容が lessons[0] に対応します)。`,
    '各lessonについて、sentencesの各textを結合すると、そのlessonのtextの本文と(空白を除き)一致するようにしてください。',
    '',
    '# vocabの書き方(厳守)',
    '- 各文につき2〜4語程度の重要語句を選び、{ "text": "対象言語の単語", "meaning": "日本語の意味" } の配列にする。',
    `- textには必ず${language.promptName}を、meaningには必ず日本語の意味・訳語を書く。`,
    '- 禁止: meaningにtextと同じ語をそのまま書く、meaningを空にする、meaningを日本語以外にする。これは最後の文を含む配列内の「すべての」要素に例外なく適用する。',
    '',
    '# grammarの書き方(厳守)',
    '- 単語を左から右へ機械的に並べて訳すだけでは不可。',
    '- その文で使われている文法パターン(語順・時制・接続表現など)が何を意味し、どう機能しているかを説明すること。',
    '- 1〜2個の重要な文法ポイントを、パターン名→意味→用法の順で日本語で簡潔に説明する。',
    '',
    '# 文章の形式について',
    '- 指定された形式(対話文・日記・ニュース記事など)らしい文体・構成で書くこと。',
    '- 対話文の場合はsentencesを発話ごとに1文として区切ること。',
    '',
    `# 生成する${items.length}件(この順番でlessons配列に入れてください)`,
    itemsList,
  ].join('\n');
}

/**
 * LLM出力からJSON部分を抽出する(```json ... ``` で囲まれている場合に対応)
 * @param {string} content
 * @returns {string}
 */
export function extractJson(content) {
  const trimmed = content.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) return fenceMatch[1];
  return trimmed;
}

/**
 * @param {any} v
 * @returns {boolean}
 */
function isVocabItem(v) {
  return Boolean(v) && typeof v === 'object' && typeof v.text === 'string' && typeof v.meaning === 'string';
}

/**
 * @param {any} s
 * @returns {boolean}
 */
function isSentence(s) {
  return (
    Boolean(s) &&
    typeof s === 'object' &&
    typeof s.text === 'string' &&
    typeof s.translation === 'string' &&
    typeof s.grammar === 'string' &&
    Array.isArray(s.vocab) &&
    s.vocab.every(isVocabItem)
  );
}

/**
 * @param {any} l
 * @returns {boolean}
 */
function isLesson(l) {
  return (
    Boolean(l) &&
    typeof l === 'object' &&
    typeof l.title === 'string' &&
    typeof l.text === 'string' &&
    Array.isArray(l.sentences) &&
    l.sentences.every(isSentence)
  );
}

/**
 * @typedef {Object} ParsedLesson
 * @property {string} theme
 * @property {string} angle
 * @property {string} title
 * @property {string} text
 * @property {SentenceExplanation[]} sentences
 */

/**
 * @typedef {Object} ParsedBatch
 * @property {ParsedLesson[]} entries
 * @property {string[]} warnings
 */

/**
 * AIチャットの返答(pasteされた生テキスト)を解析し、プロンプト生成時に確定させたテーマ・切り口と
 * 順番で対応付けて保存用のエントリ配列にする。
 * @param {string} raw
 * @param {BatchItem[]} items
 * @returns {ParsedBatch}
 */
export function parseBatchResponse(raw, items) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new Error('貼り付けられたテキストが空です');
  }

  const jsonText = extractJson(raw);
  /** @type {any} */
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('JSONとして解析できませんでした。AIチャットの返答全体を貼り付けているか確認してください');
  }

  const lessons = Array.isArray(parsed) ? parsed : parsed?.lessons;
  if (!Array.isArray(lessons) || lessons.length === 0) {
    throw new Error('想定した形式(lessons配列)が見つかりませんでした');
  }

  const invalidIndex = lessons.findIndex((l) => !isLesson(l));
  if (invalidIndex !== -1) {
    throw new Error(
      `${invalidIndex + 1}件目のlessonの形式が想定と異なります(title・text・sentencesの各項目を確認してください)`,
    );
  }

  /** @type {string[]} */
  const warnings = [];
  if (lessons.length !== items.length) {
    warnings.push(
      `生成を依頼した${items.length}件に対し、貼り付けられた結果は${lessons.length}件でした。テーマ・形式のラベルは順番で対応付けられる分のみ正しく付与されます`,
    );
  }

  const entries = lessons.map((lesson, i) => ({
    theme: items[i]?.theme ?? '(不明)',
    angle: items[i]?.angle ?? '(不明)',
    title: lesson.title,
    text: lesson.text,
    sentences: lesson.sentences,
  }));

  return { entries, warnings };
}
