// 他アプリ・他タブと衝突しないよう、このアプリのlocalStorageキーは必ずこのプレフィックスを付ける
export const STORAGE_PREFIX = 'linguaNotebook:';

const CURRENT_LANGUAGE_KEY = `${STORAGE_PREFIX}currentLanguage`;

export const DEFAULT_LANGUAGE_CODE = 'en';

/**
 * @typedef {Object} Language
 * @property {string} code - ISO 639-1相当の短いコード。localStorageキーの一部やURLに使う
 * @property {string} label - ナビ等に表示する日本語名
 * @property {string} promptName - AIチャットへのプロンプトで「何語で書くか」を伝える表記(現地語表記込み)
 */

/** @type {readonly Language[]} */
export const LANGUAGES = [
  { code: 'en', label: '英語', promptName: '英語 (English)' },
  { code: 'zh', label: '中国語', promptName: '中国語・簡体字 (简体中文)' },
  { code: 'ko', label: '韓国語', promptName: '韓国語 (한국어)' },
  { code: 'es', label: 'スペイン語', promptName: 'スペイン語 (Español)' },
  { code: 'th', label: 'タイ語', promptName: 'タイ語 (ภาษาไทย)' },
  { code: 'vi', label: 'ベトナム語', promptName: 'ベトナム語 (Tiếng Việt)' },
  { code: 'fr', label: 'フランス語', promptName: 'フランス語 (Français)' },
  { code: 'de', label: 'ドイツ語', promptName: 'ドイツ語 (Deutsch)' },
  { code: 'it', label: 'イタリア語', promptName: 'イタリア語 (Italiano)' },
  { code: 'id', label: 'インドネシア語', promptName: 'インドネシア語 (Bahasa Indonesia)' },
];

/**
 * @param {string} code
 * @returns {boolean}
 */
export function isValidLanguageCode(code) {
  return LANGUAGES.some((l) => l.code === code);
}

/**
 * @param {string} code
 * @returns {Language}
 */
export function getLanguageByCode(code) {
  return LANGUAGES.find((l) => l.code === code) ?? /** @type {Language} */ (LANGUAGES[0]);
}

/**
 * 現在の学習対象言語をlocalStorageから読む。未設定・不正値のときは既定言語にフォールバックする。
 * @param {Storage} [storage]
 * @returns {string}
 */
export function getCurrentLanguageCode(storage = globalThis.localStorage) {
  try {
    const stored = storage?.getItem(CURRENT_LANGUAGE_KEY);
    if (stored && isValidLanguageCode(stored)) return stored;
  } catch {
    // localStorageにアクセスできない環境(プライベートブラウジング等)は既定言語として扱う
  }
  return DEFAULT_LANGUAGE_CODE;
}

/**
 * 現在の学習対象言語をlocalStorageに保存する。
 * @param {string} code
 * @param {Storage} [storage]
 */
export function setCurrentLanguageCode(code, storage = globalThis.localStorage) {
  if (!isValidLanguageCode(code)) return;
  try {
    storage?.setItem(CURRENT_LANGUAGE_KEY, code);
  } catch {
    // 書き込み失敗は機能上補助的なので無視する(タブを閉じるまでは選択状態が保たれる)
  }
}
