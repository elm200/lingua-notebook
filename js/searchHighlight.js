/**
 * @typedef {import('./historyStore.js').HistoryEntry} HistoryEntry
 * @typedef {import('./historyStore.js').SentenceExplanation} SentenceExplanation
 */

/**
 * HTML特殊文字をエスケープする(DOMに依存しない純粋な文字列処理)
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * vocab配列を表示用の文字列に整形する
 * @param {Array<{text: string, meaning: string}>} vocab
 * @returns {string}
 */
export function formatVocab(vocab) {
  if (!Array.isArray(vocab)) return '';
  return vocab.map((v) => `${v.text} ${v.meaning}`).join(' / ');
}

/**
 * textをエスケープしつつ、query に一致する箇所(大文字小文字を区別しない)を
 * <mark class="search-highlight">...</mark> で囲んだHTML文字列を返す
 * @param {string} text
 * @param {string} query
 * @returns {string}
 */
export function highlightMatches(text, query) {
  if (!query) return escapeHtml(text);

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let html = '';
  let cursor = 0;
  let matchIndex = lowerText.indexOf(lowerQuery, cursor);

  while (matchIndex !== -1) {
    html += escapeHtml(text.slice(cursor, matchIndex));
    html += `<mark class="search-highlight">${escapeHtml(text.slice(matchIndex, matchIndex + query.length))}</mark>`;
    cursor = matchIndex + query.length;
    matchIndex = lowerText.indexOf(lowerQuery, cursor);
  }
  html += escapeHtml(text.slice(cursor));
  return html;
}

/**
 * @typedef {Object} SentenceSearchHit
 * @property {HistoryEntry} entry
 * @property {number} sentenceIndex
 * @property {SentenceExplanation} sentence
 */

/**
 * 全エントリの各文(sentences[].text)からqueryを部分一致検索する
 * @param {HistoryEntry[]} entries
 * @param {string} query
 * @returns {SentenceSearchHit[]}
 */
export function searchSentences(entries, query) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const lowerQuery = trimmed.toLowerCase();
  /** @type {SentenceSearchHit[]} */
  const results = [];
  for (const entry of entries) {
    entry.sentences.forEach((sentence, sentenceIndex) => {
      if (sentence.text.toLowerCase().includes(lowerQuery)) {
        results.push({ entry, sentenceIndex, sentence });
      }
    });
  }
  return results;
}
