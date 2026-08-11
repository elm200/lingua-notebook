import { escapeHtml } from './searchHighlight.js';
import { getCurrentLanguageCode, LANGUAGES, setCurrentLanguageCode } from './languages.js';

/**
 * @typedef {{ path: string, navLabel: string }} PageDef
 * @typedef {{ path: string, label: string, icon: string, current: boolean }} NavItem
 * @typedef {{ h1: string, navItems: NavItem[] }} HeaderConfig
 */

const APP_NAME = 'Lingua Notebook';

const ICON_ADD =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>';
const ICON_LIST =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h9l4 4v14a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M14 3v5h5"/><path d="M8 13h8M8 17h5"/></svg>';
const ICON_BOOK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6.5c-1.5-1.2-3.6-1.7-6-1.7v13c2.4 0 4.5.5 6 1.7 1.5-1.2 3.6-1.7 6-1.7v-13c-2.4 0-4.5.5-6 1.7z"/><path d="M12 6.5v13"/></svg>';

/** @type {(PageDef & { icon: string })[]} */
const PAGES = [
  { path: '/index.html', navLabel: 'テキスト生成', icon: ICON_ADD },
  { path: '/history.html', navLabel: 'テキスト一覧', icon: ICON_LIST },
  { path: '/words.html', navLabel: '単語帳', icon: ICON_BOOK },
];

/**
 * @param {string} pathname
 * @returns {HeaderConfig}
 */
export function getHeaderConfig(pathname) {
  const current = PAGES.find((p) => p.path === pathname) ?? PAGES[0];
  return {
    h1: APP_NAME,
    navItems: PAGES.map((p) => ({
      path: p.path,
      label: p.navLabel,
      icon: p.icon,
      current: p.path === current.path,
    })),
  };
}

/**
 * 言語を切り替える。学習対象言語が変わると履歴・単語帳の表示内容が丸ごと変わるため、
 * SPA遷移で部分的に差し替えるのではなく、確実性を優先してページ全体をリロードする。
 * @param {string} code
 */
function switchLanguage(code) {
  setCurrentLanguageCode(code);
  // 言語をまたぐと意味のないクエリ(例: history.htmlの?q=旧言語の単語)を持ち越さない
  window.location.href = window.location.pathname;
}

export function renderHeader() {
  const config = getHeaderConfig(window.location.pathname);
  const nav = config.navItems
    .map(
      (item) =>
        `<a href="${item.path}"${item.current ? ' aria-current="page"' : ''}>${item.icon}<span class="nav-label">${escapeHtml(item.label)}</span></a>`,
    )
    .join('');

  const currentCode = getCurrentLanguageCode();
  const langOptions = LANGUAGES.map(
    (l) => `<option value="${l.code}"${l.code === currentCode ? ' selected' : ''}>${escapeHtml(l.label)}</option>`,
  ).join('');

  const headerEl = document.querySelector('header.app-header');
  if (!headerEl) return;

  headerEl.innerHTML = `
    <div class="app-header-top">
      <h1>${escapeHtml(config.h1)}</h1>
      <label class="lang-switcher">
        <span class="visually-hidden">学習対象言語</span>
        <select id="lang-select" aria-label="学習対象言語">${langOptions}</select>
      </label>
    </div>
    <nav>${nav}</nav>
  `;

  const langSelect = /** @type {HTMLSelectElement} */ (headerEl.querySelector('#lang-select'));
  langSelect.addEventListener('change', () => switchLanguage(langSelect.value));
}
