import { getCurrentLanguageCode, getLanguageByCode } from './languages.js';
import { THEMES } from './themes.js';
import { ANGLES } from './angles.js';
import { BATCH_SIZE, buildPrompt, parseBatchResponse, pickRandomBatch } from './promptBuilder.js';
import { readJson, removeJson, writeJson } from './db.js';
import { saveHistoryEntries } from './historyStore.js';
import { initWordQuickAdd } from './wordQuickAdd.js';

/**
 * @typedef {import('./promptBuilder.js').BatchItem} BatchItem
 */

const PENDING_BATCH_KEY_PREFIX = 'pendingBatch:';

/**
 * @param {string} lang
 * @returns {{ items: BatchItem[], createdAt: number } | null}
 */
function readPendingBatch(lang) {
  return readJson(PENDING_BATCH_KEY_PREFIX + lang, null);
}

export function init() {
  const langNameEl = /** @type {HTMLElement} */ (document.getElementById('current-language-name'));
  const generateBtn = /** @type {HTMLButtonElement} */ (document.getElementById('generate-prompt-btn'));
  const generateBtnDefaultLabel = generateBtn.textContent ?? '';

  const pasteTextareaEl = /** @type {HTMLTextAreaElement} */ (document.getElementById('paste-textarea'));
  const saveBatchBtn = /** @type {HTMLButtonElement} */ (document.getElementById('save-batch-btn'));
  const saveStatusEl = /** @type {HTMLElement} */ (document.getElementById('save-status'));

  const wordFormEl = /** @type {HTMLFormElement} */ (document.getElementById('word-form'));
  const wordTextInput = /** @type {HTMLInputElement} */ (document.getElementById('word-text'));
  const wordMeaningInput = /** @type {HTMLInputElement} */ (document.getElementById('word-meaning'));
  const wordFormStatusEl = /** @type {HTMLElement} */ (document.getElementById('word-form-status'));
  const recentWordsEl = /** @type {HTMLElement} */ (document.getElementById('recent-words'));

  initWordQuickAdd({
    formEl: wordFormEl,
    textInput: wordTextInput,
    meaningInput: wordMeaningInput,
    statusEl: wordFormStatusEl,
    recentListEl: recentWordsEl,
  });

  function currentLanguage() {
    return getLanguageByCode(getCurrentLanguageCode());
  }

  langNameEl.textContent = currentLanguage().label;

  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let feedbackTimer;

  /**
   * ボタン自体の見た目を一時的に変えて、コピーが起きたこと(または失敗したこと)を伝える。
   * 別要素にステータス文言を出す方式だと目に入りにくい・UIが増えて煩雑になるため、
   * 操作した本人であるボタンそのものにフィードバックを返す
   * @param {'copied' | 'error'} kind
   * @param {string} label
   */
  function flashButton(kind, label) {
    clearTimeout(feedbackTimer);
    generateBtn.classList.remove('is-copied', 'is-error', 'pop');
    void generateBtn.offsetWidth; // popアニメーションを再度発火させるための強制リフロー
    generateBtn.classList.add(kind === 'copied' ? 'is-copied' : 'is-error', 'pop');
    generateBtn.textContent = label;

    feedbackTimer = setTimeout(() => {
      generateBtn.classList.remove('is-copied', 'is-error', 'pop');
      generateBtn.textContent = generateBtnDefaultLabel;
    }, 1800);
  }

  /**
   * @param {string} text
   */
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      flashButton('copied', '✓ コピーしました');
    } catch {
      flashButton('error', 'コピーに失敗しました');
      // 自動コピーができない環境向けの最終手段。常設UIにはせず、失敗時だけ手動コピーの手段を残す
      window.prompt('自動コピーに失敗しました。下のテキストを選択してコピーしてください:', text);
    }
  }

  function handleGeneratePrompt() {
    const lang = currentLanguage();
    /** @type {BatchItem[]} */
    const items = pickRandomBatch(THEMES, ANGLES, BATCH_SIZE);
    const prompt = buildPrompt(lang, items);

    writeJson(PENDING_BATCH_KEY_PREFIX + lang.code, { items, createdAt: Date.now() });

    copyToClipboard(prompt);
  }

  function handleSaveBatch() {
    const lang = currentLanguage();
    const pending = readPendingBatch(lang.code);
    const items = pending?.items ?? [];

    saveStatusEl.textContent = '';
    saveStatusEl.classList.remove('error');

    try {
      const { entries, warnings } = parseBatchResponse(pasteTextareaEl.value, items);
      const saved = saveHistoryEntries(lang.code, entries);
      removeJson(PENDING_BATCH_KEY_PREFIX + lang.code);
      pasteTextareaEl.value = '';
      const message = `${saved.length}件を保存しました。`;
      saveStatusEl.textContent = warnings.length ? `${message} ${warnings.join(' ')}` : message;
    } catch (err) {
      saveStatusEl.textContent = err instanceof Error ? err.message : String(err);
      saveStatusEl.classList.add('error');
    }
  }

  generateBtn.addEventListener('click', handleGeneratePrompt);
  saveBatchBtn.addEventListener('click', handleSaveBatch);
}
