import { createId, readJson, writeJson } from './db.js';

const KEY_PREFIX = 'words:';

/**
 * @typedef {Object} WordEntry
 * @property {string} id
 * @property {string} lang - 言語コード(js/languages.jsのLanguage.code)
 * @property {string} text - 学習対象言語の単語
 * @property {string} meaning - 日本語の意味(手動登録時は任意。単語は文脈から意味を習得する方針のためUI上は通常表示しない)
 * @property {number} createdAt - 登録日時のunixタイムスタンプ(ms)
 */

/**
 * 指定言語の単語を登録日時の新しい順で全件取得する
 * @param {string} lang
 * @param {Storage} [storage]
 * @returns {WordEntry[]}
 */
export function listWords(lang, storage) {
  const words = readJson(KEY_PREFIX + lang, [], storage);
  if (!Array.isArray(words)) return [];
  // createdAtはミリ秒精度なので、同期処理では複数件が同じ値になり得る。
  // 配列は常に「古い→新しい」の順で追記されるため、先に反転してから安定ソートすることで、
  // 同値のときは後から追加された方(=配列の後ろにあった方)が先に来るようにする
  return [...words].reverse().sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * 同じtextを持つ既存エントリ(編集ならreplaceIdで指定した対象も)を削除してから、
 * 新しいid・createdAtで登録し直す。
 *
 * 学習者は「この単語を前に登録したかどうか」を覚えていないことが多く、それ自体はどうでもよい。
 * むしろ「最近関心を持って登録した単語」として一覧の先頭(登録日時順)に来ることの方が学習体験と
 * して重要。そのため重複登録はエラーにせず、常に「削除→新規登録」で最新化する。
 * @param {string} lang
 * @param {{ text: string, meaning?: string, replaceId?: string }} params
 * @param {Storage} [storage]
 * @returns {WordEntry}
 */
export function upsertWord(lang, { text, meaning = '', replaceId }, storage) {
  const trimmedText = text.trim();
  const trimmedMeaning = meaning.trim();
  const existing = readJson(KEY_PREFIX + lang, [], storage);
  const remaining = (Array.isArray(existing) ? existing : []).filter(
    (w) => w.text !== trimmedText && w.id !== replaceId,
  );

  /** @type {WordEntry} */
  const entry = {
    id: createId(),
    lang,
    text: trimmedText,
    meaning: trimmedMeaning,
    createdAt: Date.now(),
  };
  writeJson(KEY_PREFIX + lang, [...remaining, entry], storage);
  return entry;
}

/**
 * idで指定した単語を削除する
 * @param {string} lang
 * @param {string} id
 * @param {Storage} [storage]
 */
export function deleteWord(lang, id, storage) {
  const existing = readJson(KEY_PREFIX + lang, [], storage);
  const filtered = (Array.isArray(existing) ? existing : []).filter((w) => w.id !== id);
  writeJson(KEY_PREFIX + lang, filtered, storage);
}
