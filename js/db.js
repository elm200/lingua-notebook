import { STORAGE_PREFIX } from './languages.js';

/**
 * @param {string} key
 * @param {any} fallback
 * @param {Storage} [storage]
 * @returns {any}
 */
export function readJson(key, fallback, storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(STORAGE_PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    // JSON.parse失敗やlocalStorage自体にアクセスできない環境(プライベートブラウジング等)は
    // 黙ってfallbackを返す
    return fallback;
  }
}

/**
 * @param {string} key
 * @param {any} value
 * @param {Storage} [storage]
 */
export function writeJson(key, value, storage = globalThis.localStorage) {
  try {
    storage?.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // クォータ超過等は書き込みを諦める。このアプリはlocalStorageのみが保存先のため
    // サーバー側の控えは無く、失敗時は単純にその変更が保存されない
  }
}

/**
 * @param {string} key
 * @param {Storage} [storage]
 */
export function removeJson(key, storage = globalThis.localStorage) {
  try {
    storage?.removeItem(STORAGE_PREFIX + key);
  } catch {
    // ignore
  }
}

/**
 * 各エントリ(履歴・単語)に共通のランダムID(作成時刻+乱数)を発行する。
 * @returns {string}
 */
export function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
