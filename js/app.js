import { getCurrentLanguageCode, getLanguageByCode } from './languages.js';
import { THEMES } from './themes.js';
import { ANGLES } from './angles.js';
import { BATCH_SIZE, buildPrompt, parseBatchResponse, pickRandomBatch } from './promptBuilder.js';
import { readJson, removeJson, writeJson } from './db.js';
import { saveHistoryEntries } from './historyStore.js';
import { initWordQuickAdd } from './wordQuickAdd.js';
import { escapeHtml } from './searchHighlight.js';

/**
 * @typedef {import('./promptBuilder.js').BatchItem} BatchItem
 * @typedef {import('./historyStore.js').HistoryEntry} HistoryEntry
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
  const promptStatusEl = /** @type {HTMLElement} */ (document.getElementById('prompt-status'));
  const promptSection = /** @type {HTMLElement} */ (document.getElementById('prompt-section'));
  const promptOutputEl = /** @type {HTMLTextAreaElement} */ (document.getElementById('prompt-output'));
  const copyAgainBtn = /** @type {HTMLButtonElement} */ (document.getElementById('copy-again-btn'));

  const pasteTextareaEl = /** @type {HTMLTextAreaElement} */ (document.getElementById('paste-textarea'));
  const saveBatchBtn = /** @type {HTMLButtonElement} */ (document.getElementById('save-batch-btn'));
  const saveStatusEl = /** @type {HTMLElement} */ (document.getElementById('save-status'));
  const savedSummarySection = /** @type {HTMLElement} */ (document.getElementById('saved-summary'));
  const savedSummaryListEl = /** @type {HTMLElement} */ (document.getElementById('saved-summary-list'));

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

  /**
   * @param {string} text
   */
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      promptStatusEl.textContent = 'クリップボードにコピーしました。AIチャットサービスに貼り付けて実行してください。';
      promptStatusEl.classList.remove('error');
    } catch {
      promptStatusEl.textContent = '自動コピーに失敗しました。下のテキストボックスの内容を選択してコピーしてください。';
      promptStatusEl.classList.add('error');
    }
  }

  function handleGeneratePrompt() {
    const lang = currentLanguage();
    /** @type {BatchItem[]} */
    const items = pickRandomBatch(THEMES, ANGLES, BATCH_SIZE);
    const prompt = buildPrompt(lang, items);

    writeJson(PENDING_BATCH_KEY_PREFIX + lang.code, { items, createdAt: Date.now() });

    promptSection.classList.remove('hidden');
    promptOutputEl.value = prompt;
    savedSummarySection.classList.add('hidden');

    copyToClipboard(prompt);
  }

  function handleCopyAgain() {
    copyToClipboard(promptOutputEl.value);
  }

  /**
   * @param {HistoryEntry[]} saved
   * @param {string[]} warnings
   */
  function renderSavedSummary(saved, warnings) {
    savedSummarySection.classList.remove('hidden');
    const warningHtml = warnings.length
      ? `<p class="save-warning">${warnings.map(escapeHtml).join('<br>')}</p>`
      : '';
    const itemsHtml = saved
      .map(
        (e) => `
      <li>
        <span class="theme-badge">${escapeHtml(e.theme)}</span>
        <span class="angle-badge">${escapeHtml(e.angle)}</span>
        <span class="saved-title lang-text">${escapeHtml(e.title)}</span>
      </li>`,
      )
      .join('');
    savedSummaryListEl.innerHTML = warningHtml + `<ul class="saved-summary-items">${itemsHtml}</ul>`;
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
      renderSavedSummary(saved, warnings);
      saveStatusEl.textContent = `${saved.length}件を保存しました。`;
    } catch (err) {
      saveStatusEl.textContent = err instanceof Error ? err.message : String(err);
      saveStatusEl.classList.add('error');
    }
  }

  generateBtn.addEventListener('click', handleGeneratePrompt);
  copyAgainBtn.addEventListener('click', handleCopyAgain);
  saveBatchBtn.addEventListener('click', handleSaveBatch);
}
