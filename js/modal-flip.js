/* ============================================================
   modal-flip.js — 24/25/26 · 卡片自己长成弹层
   ------------------------------------------------------------
   点击不是弹出一个新窗口，而是这张卡从原来的位置飞到屏幕中央、
   同时展开成完整详情面板。记录卡片的 getBoundingClientRect()，
   让面板从那个位置/缩放插值到最终位置，全程能看到它是「同一张卡」。
   关闭时反向播放，焦点归还给触发卡片。
   ============================================================ */

(function () {
  'use strict';

  const modal = document.getElementById('scModal');
  if (!modal) return;

  const panel    = modal.querySelector('.sc-modal__panel');
  const scroller = modal.querySelector('.sc-modal__scroll');
  const backdrop = modal.querySelector('.sc-modal__backdrop');
  const closeBtn = modal.querySelector('.sc-modal__close');
  const bodies   = Array.prototype.slice.call(modal.querySelectorAll('[data-modal-body]'));

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const OPEN_MS  = reduce ? 0 : 500;
  const CLOSE_MS = reduce ? 0 : 400;
  const EASE = 'cubic-bezier(.2, .8, .2, 1)';

  let opener = null;      // 触发的那张卡，关闭后焦点还给它
  let busy = false;

  function showBody(key) {
    bodies.forEach(function (b) {
      const on = b.dataset.modalBody === key;
      b.hidden = !on;
      if (!on) return;
      modal.style.setProperty('--sc-c', b.dataset.color || 'var(--orange)');
      /* 弹层共用一个面板、按 key 换内容，所以可访问名要跟着换。
         aria-labelledby 固定指向第一张卡的标题的话，读屏会一直念「产品经理能力」。 */
      const title = b.querySelector('.sc-modal__cn');
      if (title) modal.setAttribute('aria-label', title.textContent.trim());
    });
  }

  function open(card) {
    if (busy || modal.classList.contains('is-open')) return;
    busy = true;
    opener = card;

    showBody(card.dataset.key);

    const from = card.getBoundingClientRect();
    modal.classList.add('is-open');
    document.body.classList.add('modal-open');
    if (scroller) scroller.scrollTop = 0;

    const to = panel.getBoundingClientRect();
    /* 统一缩放，非等比会把面板内容拉变形 */
    const scale = Math.max(from.width / to.width, .05);
    const dx = (from.left + from.width / 2) - (to.left + to.width / 2);
    const dy = (from.top + from.height / 2) - (to.top + to.height / 2);

    const a = panel.animate(
      [
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + scale + ')', opacity: .55 },
        { transform: 'translate(0,0) scale(1)', opacity: 1 }
      ],
      { duration: OPEN_MS, easing: EASE, fill: 'both' }
    );
    a.onfinish = function () {
      a.cancel();
      busy = false;
      (closeBtn || panel).focus();
    };
  }

  function close() {
    if (busy || !modal.classList.contains('is-open')) return;
    busy = true;

    const to = panel.getBoundingClientRect();
    const from = opener ? opener.getBoundingClientRect() : null;

    function done() {
      modal.classList.remove('is-open');
      document.body.classList.remove('modal-open');
      busy = false;
      /* 焦点归还给触发者。卡片本身不可聚焦，还给舞台。 */
      if (stage) stage.focus();
      opener = null;
    }

    if (!from || CLOSE_MS === 0) { done(); return; }

    const scale = Math.max(from.width / to.width, .05);
    const dx = (from.left + from.width / 2) - (to.left + to.width / 2);
    const dy = (from.top + from.height / 2) - (to.top + to.height / 2);

    const a = panel.animate(
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + scale + ')', opacity: .3 }
      ],
      { duration: CLOSE_MS, easing: EASE, fill: 'both' }
    );
    a.onfinish = function () { a.cancel(); done(); };
  }

  /* 25 · 只有最上面那张能点开。
     打开的信号由轮播派发 —— 它知道这一下是点击还是拖动的收尾，
     也知道当前最前的是哪张。卡片自己的 click 收不到事件：
     拖动时 setPointerCapture 会把后续事件重定向到 stage。
     点卡片任意位置（含空白处）都算，不必点"查看详情"。 */
  const stage = document.querySelector('.sc-stage');
  if (stage) {
    stage.addEventListener('sc:activate', function (e) {
      const card = e.detail && e.detail.card;
      if (card) open(card);
    });
  }

  /* 26 · ESC、点遮罩、点右上角 × 都能关 */
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (backdrop) backdrop.addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
  });

  /* 调试开关 ?modal=03：直接打开第三张卡的详情，省得每次翻牌再点 */
  const want = new URLSearchParams(location.search).get('modal');
  if (want) {
    const target = document.querySelector('.sc-card[data-key="' + want + '"]');
    if (target) requestAnimationFrame(function () { open(target); });
  }

  /* 焦点困在弹层内 */
  modal.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || !modal.classList.contains('is-open')) return;
    const items = modal.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
})();
