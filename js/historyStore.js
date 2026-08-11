import { createId, readJson, writeJson } from './db.js';

const KEY_PREFIX = 'history:';

/**
 * @typedef {Object} VocabItem
 * @property {string} text - 学習対象言語の単語
 * @property {string} meaning - 日本語の意味
 */

/**
 * @typedef {Object} SentenceExplanation
 * @property {string} text - 学習対象言語の原文(1文)
 * @property {string} translation - 日本語訳
 * @property {string} grammar - 文法解説(日本語)
 * @property {VocabItem[]} vocab - 語句解説
 */

/**
 * @typedef {Object} HistoryEntry
 * @property {string} id
 * @property {string} lang - 言語コード(js/languages.jsのLanguage.code)
 * @property {string} theme
 * @property {string} angle - 生成に使った文章の形式(切り口)
 * @property {string} title - 本文を要約する短いタイトル(学習対象言語)
 * @property {string} text - 生成された本文全体(学習対象言語)
 * @property {SentenceExplanation[]} sentences
 * @property {number} createdAt - 作成日時のunixタイムスタンプ(ms)
 */

/**
 * 指定言語の学習エントリを新しい順で全件取得する
 * @param {string} lang
 * @param {Storage} [storage]
 * @returns {HistoryEntry[]}
 */
export function listHistory(lang, storage) {
  const entries = readJson(KEY_PREFIX + lang, [], storage);
  if (!Array.isArray(entries)) return [];
  // createdAtはミリ秒精度なので、同期処理では複数件が同じ値になり得る(バッチ内はcreatedAtを
  // わずかにずらして回避しているが、バッチ間ではここでの安定ソートに委ねる)。配列は常に
  // 「古い→新しい」の順で追記されるため、先に反転してから安定ソートすることで、同値のときは
  // 後から追加された方(=配列の後ろにあった方)が先に来るようにする
  return [...entries].reverse().sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * 生成バッチ(複数件)を指定言語の履歴に追加保存する。id・createdAtはここで発行する。
 * @param {string} lang
 * @param {Array<Omit<HistoryEntry, 'id' | 'lang' | 'createdAt'>>} items
 * @param {Storage} [storage]
 * @returns {HistoryEntry[]} 保存した完全なエントリの配列
 */
export function saveHistoryEntries(lang, items, storage) {
  const existing = readJson(KEY_PREFIX + lang, [], storage);
  const base = Array.isArray(existing) ? existing : [];
  const now = Date.now();
  /** @type {HistoryEntry[]} */
  const saved = items.map((item, i) => ({
    ...item,
    id: createId(),
    lang,
    // バッチ内の並び順(themes/anglesの提示順)が新しい順の一覧でも保たれるよう、
    // 同一msの衝突を避けてインデックス分だけ後の項目ほどわずかに古い時刻にする
    createdAt: now - i,
  }));
  writeJson(KEY_PREFIX + lang, [...base, ...saved], storage);
  return saved;
}

/**
 * idで指定した学習エントリを削除する
 * @param {string} lang
 * @param {string} id
 * @param {Storage} [storage]
 */
export function deleteHistoryEntry(lang, id, storage) {
  const existing = readJson(KEY_PREFIX + lang, [], storage);
  const filtered = (Array.isArray(existing) ? existing : []).filter((e) => e.id !== id);
  writeJson(KEY_PREFIX + lang, filtered, storage);
}
