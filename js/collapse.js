/**
 * 削除された要素をフェードアウト+収縮させ、アニメーション完了後にresolveする。
 *
 * 収縮の開始値(現在の高さ)は実測しないと分からないためインラインスタイルで与える。
 * 終了値の`max-height: 0`もインラインで与える必要がある点に注意: クラス側で指定しても
 * インラインスタイルの方が優先されて収縮しない。
 *
 * DOMからの除去や非表示化は呼び出し側の責務で、この関数は付与したスタイルを必ず元に戻す。
 * @param {HTMLElement} el
 * @returns {Promise<void>}
 */
export function animateCollapse(el) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();

  return new Promise((resolve) => {
    el.style.maxHeight = `${el.getBoundingClientRect().height}px`;
    el.classList.add('collapsible');
    el.getBoundingClientRect(); // 上の代入をレイアウトに確定させてから収縮を始めるための強制リフロー

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(fallbackTimer);
      el.removeEventListener('transitionend', onTransitionEnd);
      el.classList.remove('collapsible', 'collapsing');
      el.style.maxHeight = '';
      resolve();
    };

    /** @param {TransitionEvent} e */
    const onTransitionEnd = (e) => {
      if (e.target !== el) return; // 子要素のtransition(ホバー時の背景色など)がバブリングしてくるため
      finish();
    };
    el.addEventListener('transitionend', onTransitionEnd);
    const fallbackTimer = setTimeout(finish, 400); // transitionendが発火しなかった場合の保険

    requestAnimationFrame(() => {
      el.classList.add('collapsing');
      el.style.maxHeight = '0px';
    });
  });
}
