import { escapeHtml } from './searchHighlight.js';
import { getCurrentLanguageCode } from './languages.js';
import { deleteWord, listWords, upsertWord } from './wordStore.js';

/**
 * @typedef {import('./wordStore.js').WordEntry} WordEntry
 */

export function init() {
  const listEl = /** @type {HTMLElement} */ (document.getElementById('word-list'));

  const formEl = /** @type {HTMLFormElement} */ (document.getElementById('word-form'));
  const idInput = /** @type {HTMLInputElement} */ (document.getElementById('word-id'));
  const textInput = /** @type {HTMLInputElement} */ (document.getElementById('word-text'));
  const meaningInput = /** @type {HTMLInputElement} */ (document.getElementById('word-meaning'));
  const submitBtn = /** @type {HTMLButtonElement} */ (document.getElementById('form-submit'));
  const cancelBtn = /** @type {HTMLButtonElement} */ (document.getElementById('form-cancel'));
  const formStatusEl = /** @type {HTMLElement} */ (document.getElementById('form-status'));

  const lang = getCurrentLanguageCode();

  /**
   * @param {number} ts
   * @returns {string}
   */
  function formatDate(ts) {
    return new Date(ts).toLocaleString('ja-JP');
  }

  function resetForm() {
    formEl.reset();
    idInput.value = '';
    submitBtn.textContent = '登録';
    cancelBtn.classList.add('hidden');
    formStatusEl.textContent = '';
  }

  /**
   * @param {WordEntry} word
   */
  function startEdit(word) {
    idInput.value = word.id;
    textInput.value = word.text;
    meaningInput.value = word.meaning;
    submitBtn.textContent = '更新';
    cancelBtn.classList.remove('hidden');
    formStatusEl.textContent = '';
    textInput.focus();
    formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderWords() {
    const words = listWords(lang);
    listEl.innerHTML = '';

    if (words.length === 0) {
      listEl.innerHTML = '<li class="empty">登録された単語はまだありません</li>';
      return;
    }

    for (const word of words) {
      const hasMeaning = word.meaning.trim() !== '';
      // data-tooltipはCSSの::afterでカスタムツールチップとして表示する(js/words.jsではなくcss/style.css側の
      // .word-meaning-btn[data-tooltip]:hover::after を参照)。titleに頼るとOS標準の表示になり遅延も出るため使わない
      const meaningBtnAttrs = hasMeaning
        ? `data-tooltip="${escapeHtml(word.meaning)}" aria-label="意味: ${escapeHtml(word.meaning)}"`
        : 'disabled aria-label="意味は登録されていません"';

      const li = document.createElement('li');
      li.className = 'word-item card';
      li.innerHTML = `
        <a class="word-text-link lang-text" href="/history.html?q=${encodeURIComponent(word.text)}">${escapeHtml(word.text)}</a>
        <span class="word-date">${formatDate(word.createdAt)}</span>
        <span class="word-actions">
          <button type="button" class="secondary-btn word-meaning-btn" ${meaningBtnAttrs}>意味</button>
          <button type="button" class="secondary-btn word-edit-btn">編集</button>
          <button type="button" class="secondary-btn word-delete-btn">削除</button>
        </span>
      `;

      const editBtn = /** @type {HTMLButtonElement} */ (li.querySelector('.word-edit-btn'));
      editBtn.addEventListener('click', () => startEdit(word));

      const deleteBtn = /** @type {HTMLButtonElement} */ (li.querySelector('.word-delete-btn'));
      deleteBtn.addEventListener('click', () => handleDelete(word));

      listEl.appendChild(li);
    }
  }

  /**
   * @param {WordEntry} word
   */
  function handleDelete(word) {
    if (!window.confirm(`「${word.text}」を削除しますか?`)) return;
    if (idInput.value === word.id) resetForm();
    deleteWord(lang, word.id);
    renderWords();
  }

  /**
   * @param {SubmitEvent} e
   */
  function handleSubmit(e) {
    e.preventDefault();
    const text = textInput.value.trim();
    const meaning = meaningInput.value.trim();
    if (!text) return;

    const isEdit = idInput.value !== '';
    try {
      upsertWord(lang, { text, meaning, replaceId: isEdit ? idInput.value : undefined });
      resetForm();
      renderWords();
    } catch (err) {
      formStatusEl.textContent = err instanceof Error ? err.message : String(err);
    }
  }

  formEl.addEventListener('submit', handleSubmit);
  cancelBtn.addEventListener('click', resetForm);

  renderWords();
}
