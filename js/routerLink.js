/**
 * リンク先が横取り(pjax遷移)の対象かどうかを判定する純粋関数。
 * 同一オリジンかつ`.html`のパスのみを対象とし、target指定・download属性が
 * あるものは通常のブラウザ遷移に任せる。
 * @param {{ href: string, target?: string | null, download?: boolean }} link
 * @param {string} currentOrigin
 * @returns {boolean}
 */
export function isInterceptableLink(link, currentOrigin) {
  if (link.download) return false;
  if (link.target && link.target !== '' && link.target !== '_self') return false;
  let url;
  try {
    url = new URL(link.href, currentOrigin);
  } catch {
    return false;
  }
  if (url.origin !== currentOrigin) return false;
  return url.pathname.endsWith('.html');
}
