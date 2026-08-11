import { renderHeader } from './header.js';
import { isInterceptableLink } from './routerLink.js';

/**
 * ドキュメントからページ固有のエントリースクリプトのsrcを取り出す。
 * 各ページにはrouter.js自身と、ページ固有のエントリースクリプトの2つの
 * <script type="module">があるため、router.js自身のURLを除外して後者を特定する。
 * @param {Document} doc
 * @returns {string | undefined}
 */
function findPageScript(doc) {
  const routerScriptPath = new URL(import.meta.url).pathname;
  return Array.from(doc.querySelectorAll('script[type="module"][src]'))
    .map((el) => el.getAttribute('src') || '')
    .find((src) => src && new URL(src, window.location.href).pathname !== routerScriptPath);
}

/**
 * ページ固有モジュールのinit()を呼ぶ。ページモジュールは自分自身でinit()を呼んではならず、
 * フルロード時もpjax遷移時も、初期化の呼び出し元はこの関数ただ一つに集約する。
 * (両方から呼ぶと、初回import時だけinit()が2回走りイベントリスナーが二重登録される)
 * @param {Document} doc
 */
async function initPage(doc) {
  const scriptSrc = findPageScript(doc);
  if (!scriptSrc) return;
  const mod = await import(scriptSrc);
  mod.init?.();
}

/**
 * @param {string} url
 * @param {{ push?: boolean }} [options]
 */
async function navigate(url, { push = true } = {}) {
  if (push) {
    // 離脱前に現在のスクロール位置を今いる履歴エントリへ保存する(URLは現状維持)。
    // 戻る操作でこのエントリに戻ってきたときにここへ復元する
    history.replaceState({ scrollY: window.scrollY }, '');
  }
  // 戻る/進む(popstate)時は保存済み位置へ、通常遷移時は先頭へ
  const targetScrollY = push ? 0 : (history.state?.scrollY ?? 0);

  let res;
  try {
    res = await fetch(url);
  } catch {
    window.location.href = url;
    return;
  }

  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const newMain = doc.querySelector('main');
  const currentMain = document.querySelector('main');

  if (!newMain || !currentMain) {
    window.location.href = url;
    return;
  }

  currentMain.replaceWith(newMain);
  document.title = doc.title;
  if (push) history.pushState(null, '', url);
  renderHeader();
  // 前進遷移は差し替え直後に即先頭へ(初回import待ちのちらつきを避ける)。
  // 戻る/進むは一覧描画で高さが復元されてから復元したいので initPage 後に行う
  if (push) window.scrollTo(0, 0);

  await initPage(doc);

  if (!push) window.scrollTo(0, targetScrollY);
}

document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

  const target = /** @type {HTMLElement} */ (e.target);
  const anchor = /** @type {HTMLAnchorElement | null} */ (target.closest('a'));
  if (!anchor) return;
  const linkInfo = { href: anchor.href, target: anchor.target, download: anchor.hasAttribute('download') };
  if (!isInterceptableLink(linkInfo, window.location.origin)) return;

  const url = new URL(anchor.href, window.location.href);
  if (url.pathname === window.location.pathname && url.search === window.location.search) return;

  e.preventDefault();
  navigate(url.pathname + url.search);
});

window.addEventListener('popstate', () => {
  navigate(window.location.pathname + window.location.search, { push: false });
});

// pjaxでは差し替えが非同期なためブラウザ既定の自動スクロール復元は正しく機能しない。
// popstate時のスクロール位置は navigate() 側で自前に制御する
history.scrollRestoration = 'manual';

renderHeader();
initPage(document);
