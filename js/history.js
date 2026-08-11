import { escapeHtml, highlightMatches, searchSentences } from './searchHighlight.js';
import { getCurrentLanguageCode } from './languages.js';
import { deleteHistoryEntry, listHistory } from './historyStore.js';
import { animateCollapse } from './collapse.js';
import { bindVocabAddButtons, initWordQuickAdd, renderVocabList } from './wordQuickAdd.js';

/**
 * @typedef {import('./historyStore.js').HistoryEntry} HistoryEntry
 */

/**
 * 検索欄の内容と「検索結果からどの記事が選ばれているか」で画面の表示モードを決める
 *
 * - browse: 検索していない通常状態。記事一覧をすべて表示する
 * - search: 検索実行後まだ結果をクリックしていない状態。記事一覧は隠して検索結果だけを見せる
 * - detail: 検索結果の行をクリックした状態。選ばれた記事1件だけを記事一覧に表示する
 *
 * @param {string} query - 検索欄の入力値
 * @param {string | null} selectedEntryId - 検索結果からクリックされた記事のid
 * @returns {'browse' | 'search' | 'detail'}
 */
export function resolveViewMode(query, selectedEntryId) {
  if (query.trim() === '') return 'browse';
  return selectedEntryId ? 'detail' : 'search';
}

export function init() {
  const listEl = /** @type {HTMLElement} */ (document.getElementById('history-list'));
  const searchInputEl = /** @type {HTMLInputElement} */ (document.getElementById('search-input'));
  const searchButtonEl = /** @type {HTMLButtonElement} */ (document.getElementById('search-button'));
  const searchResultsEl = /** @type {HTMLElement} */ (document.getElementById('search-results'));

  const wordFormEl = /** @type {HTMLFormElement} */ (document.getElementById('word-form'));
  const wordTextInput = /** @type {HTMLInputElement} */ (document.getElementById('word-text'));
  const wordMeaningInput = /** @type {HTMLInputElement} */ (document.getElementById('word-meaning'));
  const wordFormStatusEl = /** @type {HTMLElement} */ (document.getElementById('word-form-status'));
  const recentWordsEl = /** @type {HTMLElement} */ (document.getElementById('recent-words'));

  const quickAdd = initWordQuickAdd({
    formEl: wordFormEl,
    textInput: wordTextInput,
    meaningInput: wordMeaningInput,
    statusEl: wordFormStatusEl,
    recentListEl: recentWordsEl,
  });

  const lang = getCurrentLanguageCode();

  /** @type {HistoryEntry[]} */
  let allEntries = [];

  /**
   * @typedef {Object} EntryState
   * @property {HistoryEntry} entry
   * @property {HTMLElement} li
   * @property {HTMLElement} detail
   * @property {boolean} detailBuilt
   */

  /** @type {Map<string, EntryState>} */
  const entryStates = new Map();

  /** 検索結果からクリックされた記事のid(detailモードで1件だけ表示するために使う) */
  /** @type {string | null} */
  let selectedEntryId = null;

  /**
   * 現在のモードに応じて記事一覧の表示を切り替える。
   * DOMは破棄せずhiddenの付け外しだけで行うので、開いていた詳細やスクロール状態は保たれる
   */
  function applyViewMode() {
    const mode = resolveViewMode(searchInputEl.value, selectedEntryId);
    listEl.classList.toggle('hidden', mode === 'search');
    for (const [id, state] of entryStates) {
      state.li.classList.toggle('hidden', mode === 'detail' && id !== selectedEntryId);
    }
  }

  /**
   * @param {number} ts
   * @returns {string}
   */
  function formatDate(ts) {
    return new Date(ts).toLocaleString('ja-JP');
  }

  /**
   * エントリ詳細のHTMLを構築する(初回クリック時まで遅延させるため独立した関数にしている)
   * @param {EntryState} state
   */
  function buildDetail(state) {
    const { entry, detail } = state;
    detail.innerHTML = `
      <p class="lang-text">${escapeHtml(entry.text)}</p>
      <hr class="section-divider">
      <ol class="sentence-list">
        ${entry.sentences
          .map(
            (s, i) => `
          <li class="sentence-item" id="sentence-${entry.id}-${i}">
            <p class="lang-text">${escapeHtml(s.text)}</p>
            <p class="translation">${escapeHtml(s.translation)}</p>
            <p class="vocab">🔑 ${renderVocabList(s.vocab)}</p>
            <p class="grammar">🧩 ${escapeHtml(s.grammar)}</p>
          </li>
        `,
          )
          .join('')}
      </ol>
      <hr class="section-divider">
      <button type="button" class="danger-btn history-delete-btn">削除</button>
    `;
    const deleteBtn = /** @type {HTMLButtonElement} */ (detail.querySelector('.history-delete-btn'));
    deleteBtn.addEventListener('click', () => handleDeleteEntry(state));
    bindVocabAddButtons(detail, { onRegister: quickAdd.register });
    state.detailBuilt = true;
  }

  /**
   * @param {EntryState} state
   */
  async function handleDeleteEntry(state) {
    if (!window.confirm('このテキストを削除しますか?')) return;

    allEntries = allEntries.filter((e) => e.id !== state.entry.id);
    entryStates.delete(state.entry.id);
    // 削除した記事のヒット行が残るとクリックしても無反応になるため、検索中なら結果を作り直す
    refreshSearchIfActive();

    await animateCollapse(state.li);
    deleteHistoryEntry(lang, state.entry.id);
    state.li.remove();
    if (entryStates.size === 0) {
      listEl.innerHTML = '<li class="empty">保存された履歴はまだありません</li>';
    }
  }

  /**
   * @param {HistoryEntry[]} entries
   */
  function renderHistory(entries) {
    entryStates.clear();
    listEl.innerHTML = '';

    if (entries.length === 0) {
      listEl.innerHTML = '<li class="empty">保存された履歴はまだありません</li>';
      return;
    }

    for (const entry of entries) {
      const li = document.createElement('li');
      li.className = 'history-item card';
      li.id = `history-entry-${entry.id}`;

      const summary = document.createElement('button');
      summary.className = 'history-summary';
      summary.type = 'button';
      summary.innerHTML = `
        <span class="history-title lang-text">${escapeHtml(entry.title)}</span>
        <span class="history-meta">
          <span class="theme-badge">${escapeHtml(entry.theme)}</span>
          <span class="angle-badge">${escapeHtml(entry.angle)}</span>
          <span class="date">${formatDate(entry.createdAt)}</span>
        </span>
      `;

      const detail = document.createElement('div');
      detail.className = 'history-detail hidden';

      /** @type {EntryState} */
      const state = { entry, li, detail, detailBuilt: false };
      entryStates.set(entry.id, state);

      summary.addEventListener('click', () => {
        if (!state.detailBuilt) {
          buildDetail(state);
        }
        detail.classList.toggle('hidden');
      });

      li.appendChild(summary);
      li.appendChild(detail);
      listEl.appendChild(li);
    }

    applyViewMode();
  }

  /**
   * 検索結果の文をクリックしたとき、対応する履歴エントリだけを表示して詳細を開き、
   * 該当文までスクロールして一時的にハイライトする
   * @param {string} entryId
   * @param {number} sentenceIndex
   */
  function jumpToSentence(entryId, sentenceIndex) {
    const state = entryStates.get(entryId);
    if (!state) return;

    selectedEntryId = entryId;
    applyViewMode();

    if (!state.detailBuilt) {
      buildDetail(state);
    }
    state.detail.classList.remove('hidden');

    const sentenceEl = document.getElementById(`sentence-${entryId}-${sentenceIndex}`);
    const scrollTarget = sentenceEl || state.li;
    scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (sentenceEl) {
      sentenceEl.classList.add('flash-highlight');
      setTimeout(() => sentenceEl.classList.remove('flash-highlight'), 2000);
    }
  }

  /**
   * @param {string} query
   */
  function renderSearchResults(query) {
    // 検索をやり直したら記事の選択は解除し、検索結果だけが見えている状態に戻す
    selectedEntryId = null;

    if (query.trim() === '') {
      searchResultsEl.classList.add('hidden');
      searchResultsEl.innerHTML = '';
      applyViewMode();
      return;
    }

    const hits = searchSentences(allEntries, query);
    searchResultsEl.classList.remove('hidden');
    applyViewMode();

    if (hits.length === 0) {
      searchResultsEl.innerHTML = '<li class="empty">一致する文が見つかりませんでした</li>';
      return;
    }

    searchResultsEl.innerHTML = '';
    for (const hit of hits) {
      const li = document.createElement('li');
      li.className = 'search-result-item';
      li.innerHTML = `
        <span class="search-result-meta">
          <span class="theme-badge">${escapeHtml(hit.entry.theme)}</span>
          <span class="angle-badge">${escapeHtml(hit.entry.angle)}</span>
          <span class="search-result-title">${escapeHtml(hit.entry.title)}</span>
        </span>
        <p class="lang-text">${highlightMatches(hit.sentence.text, query.trim())}</p>
      `;
      li.addEventListener('click', () => jumpToSentence(hit.entry.id, hit.sentenceIndex));
      searchResultsEl.appendChild(li);
    }
  }

  function runSearch() {
    renderSearchResults(searchInputEl.value);
  }

  /** 検索中(検索欄に入力がある状態)のときだけ、現在の入力で結果を作り直す */
  function refreshSearchIfActive() {
    if (searchInputEl.value.trim() !== '') {
      renderSearchResults(searchInputEl.value);
    }
  }

  searchButtonEl.addEventListener('click', runSearch);
  searchInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runSearch();
  });

  /**
   * URLの?qパラメータがあれば検索欄にセットし、全履歴に対して検索を実行する
   * (単語帳画面から単語をクリックした際の遷移先として使われる)
   */
  function applyQueryParamSearch() {
    const query = new URLSearchParams(window.location.search).get('q');
    if (!query) return;
    searchInputEl.value = query;
    renderSearchResults(query);
    searchResultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  allEntries = listHistory(lang);
  renderHistory(allEntries);
  applyQueryParamSearch();
}
