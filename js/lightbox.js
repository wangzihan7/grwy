/* ============================================================
   lightbox.js — 规格 4 点开看大图 / 第 3 屏规格 5 点开看原图
   ------------------------------------------------------------
   一个通用的图片灯箱，手机原型和后台截图共用。
   点缩略图打开原图，左右方向键或箭头按钮在同组内切换，
   Esc 或点空白关闭，关闭后焦点回到刚才点的那个元素。
   ============================================================ */

(function () {
  'use strict';

  const triggers = Array.prototype.slice.call(document.querySelectorAll('[data-lb]'));
  if (!triggers.length) return;

  /* 按 data-lb 的值分组，切换只在同一组内进行 */
  const groups = {};
  triggers.forEach(function (el) {
    (groups[el.dataset.lb] = groups[el.dataset.lb] || []).push(el);
  });

  const lb = document.createElement('div');
  lb.className = 'lb';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.innerHTML =
    '<div class="lb__backdrop"></div>' +
    '<div class="lb__stage"><img alt=""></div>' +
    '<span class="lb__caption"></span>' +
    '<button class="lb__btn lb__btn--close" type="button" aria-label="关闭">' +
      '<svg viewBox="0 0 18 18"><path d="M1 1l16 16M17 1L1 17"/></svg></button>' +
    '<button class="lb__btn lb__btn--prev" type="button" aria-label="上一张">' +
      '<svg viewBox="0 0 18 18"><path d="M12 1L4 9l8 8"/></svg></button>' +
    '<button class="lb__btn lb__btn--next" type="button" aria-label="下一张">' +
      '<svg viewBox="0 0 18 18"><path d="M6 1l8 8-8 8"/></svg></button>';
  document.body.appendChild(lb);

  const stage    = lb.querySelector('.lb__stage');
  const img      = lb.querySelector('img');
  const caption  = lb.querySelector('.lb__caption');
  const btnClose = lb.querySelector('.lb__btn--close');
  const btnPrev  = lb.querySelector('.lb__btn--prev');
  const btnNext  = lb.querySelector('.lb__btn--next');

  let list = [], index = 0, opener = null;

  function render() {
    const el = list[index];
    if (!el) return;
    img.src = el.dataset.lbSrc || el.getAttribute('src') || '';
    img.alt = el.dataset.lbAlt || el.getAttribute('alt') || '';
    caption.textContent = el.dataset.lbCaption || img.alt;
    stage.scrollTop = 0;
    const many = list.length > 1;
    btnPrev.hidden = btnNext.hidden = !many;
    lb.setAttribute('aria-label', caption.textContent);
  }

  function open(el) {
    list = groups[el.dataset.lb] || [el];
    index = list.indexOf(el);
    if (index < 0) index = 0;
    opener = el;
    lb.classList.add('lb--phone');
    lb.classList.toggle('lb--phone', el.dataset.lbKind === 'phone');
    render();
    lb.classList.add('is-open');
    document.body.classList.add('lb-open');
    btnClose.focus();
  }

  function close() {
    lb.classList.remove('is-open');
    document.body.classList.remove('lb-open');
    if (opener) { opener.focus(); opener = null; }
  }

  function step(d) {
    index = (index + d + list.length) % list.length;
    render();
  }

  triggers.forEach(function (el) {
    el.addEventListener('click', function () { open(el); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(el); }
    });
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
  });

  btnClose.addEventListener('click', close);
  btnPrev.addEventListener('click', function () { step(-1); });
  btnNext.addEventListener('click', function () { step(1); });
  lb.querySelector('.lb__backdrop').addEventListener('click', close);

  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  });

  /* 焦点困在灯箱内 */
  lb.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    const items = Array.prototype.filter.call(
      lb.querySelectorAll('button'), function (b) { return !b.hidden; });
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  window.Lightbox = { open: open, close: close };
})();
