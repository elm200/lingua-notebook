import { escapeHtml } from './searchHighlight.js';
import { getCurrentLanguageCode } from './languages.js';
import { listWords, upsertWord } from './wordStore.js';

/**
 * 語句解説を単語ごとの「＋登録」ボタン付きで描画する。
 * @param {Array<{text: string, meaning: string}>} vocab
 * @returns {string}
 */
export function renderVocabList(vocab) {
  if (!Array.isArray(vocab)) return '';
  return vocab
    .map(
      (v) => `
      <span class="vocab-item" data-text="${escapeHtml(v.text)}" data-meaning="${escapeHtml(v.meaning)}">
        <span class="vocab-text">${escapeHtml(v.text)} ${escapeHtml(v.meaning)}</span>
        <button type="button" class="vocab-add-btn" title="単語帳に登録">＋</button>
      </span>`,
    )
    .join(' / ');
}

/**
 * コンテナ内の語句解説にある「＋登録」ボタンのクリックを処理する(イベント委譲)。
 * 動的に追加される要素にも対応できるよう、containerElへの委譲登録は呼び出し側で1回だけ行えばよい。
 * @param {HTMLElement} containerEl
 * @param {{ onRegister: (text: string, meaning: string) => void }} options
 */
export function bindVocabAddButtons(containerEl, { onRegister }) {
  containerEl.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const btn = /** @type {HTMLButtonElement | null} */ (target.closest('.vocab-add-btn'));
    if (!btn || btn.disabled) return;
    const item = /** @type {HTMLElement | null} */ (btn.closest('.vocab-item'));
    if (!item) return;

    const text = item.dataset.text || '';
    const meaning = item.dataset.meaning || '';

    try {
      onRegister(text, meaning);
      btn.disabled = true;
      btn.textContent = '✓';
      btn.title = '登録済み';
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err));
    }
  });
}

/**
 * @param {number} ts
 * @returns {string}
 */
function formatDate(ts) {
  return new Date(ts).toLocaleDateString('ja-JP');
}

/**
 * @param {HTMLElement} recentListEl
 * @param {Array<{ id: string, text: string, meaning: string, createdAt: number }>} words
 */
function renderRecentWords(recentListEl, words) {
  recentListEl.innerHTML = '';
  if (words.length === 0) {
    recentListEl.innerHTML = '<li class="empty">まだありません</li>';
    return;
  }
  for (const word of words.slice(0, 5)) {
    const li = document.createElement('li');
    li.className = 'recent-word-item';
    li.innerHTML = `
      <a class="word-text-link lang-text" href="/history.html?q=${encodeURIComponent(word.text)}">${escapeHtml(word.text)}</a>
      <span class="recent-word-date">${formatDate(word.createdAt)}</span>
    `;
    recentListEl.appendChild(li);
  }
}

/**
 * サイドバーの単語クイック登録フォーム(登録フォーム＋最近登録した単語一覧)を初期化する。
 * データはlocalStorageのみが相手のため同期的に完結する(サーバー通信を伴う楽観的更新は不要)。
 * @param {{ formEl: HTMLFormElement, textInput: HTMLInputElement, meaningInput: HTMLInputElement, statusEl: HTMLElement, recentListEl: HTMLElement }} refs
 * @returns {{ register: (text: string, meaning: string) => void }}
 */
export function initWordQuickAdd({ formEl, textInput, meaningInput, statusEl, recentListEl }) {
  function refresh() {
    renderRecentWords(recentListEl, listWords(getCurrentLanguageCode()));
  }

  /**
   * @param {string} text
   * @param {string} meaning
   */
  function register(text, meaning) {
    upsertWord(getCurrentLanguageCode(), { text, meaning });
    refresh();
  }

  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = textInput.value.trim();
    const meaning = meaningInput.value.trim();
    if (!text) return;

    formEl.reset();
    statusEl.textContent = '';
    try {
      register(text, meaning);
    } catch (err) {
      statusEl.textContent = err instanceof Error ? err.message : String(err);
    }
  });

  refresh();

  return { register };
}
