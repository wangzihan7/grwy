/* ============================================================
   section-title.js — 板块标题：拆字 + 进场触发
   ------------------------------------------------------------
   拆字只动 DOM 结构不动文案；原文写进 aria-label，拆出来的 span
   全部 aria-hidden，读屏软件仍然读到完整的一句话，
   不会变成「A - b - o - u - t」。
   进场只播一次（规格 47）。
   ============================================================ */

(function () {
  'use strict';

  const titles = Array.prototype.slice.call(document.querySelectorAll('.sec-title'));
  if (!titles.length) return;

  const dev = new URLSearchParams(location.search).has('dev');

  titles.forEach(function (title) {
    const en = title.querySelector('.sec-title__en');
    if (en && !en.dataset.split) {
      const text = en.textContent.trim();
      en.dataset.split = '1';
      en.setAttribute('aria-label', text);
      en.textContent = '';

      const chars = Array.from(text);
      chars.forEach(function (ch, i) {
        const span = document.createElement('span');
        span.className = 'sec-title__ch';
        span.textContent = ch === ' ' ? ' ' : ch;
        span.style.setProperty('--i', i);
        /* 歪的方向左右交替，落笔才不像整齐的机器排版 */
        span.style.setProperty('--r', (i % 2 ? -1 : 1) * (1 + (i % 3) * .35));
        span.setAttribute('aria-hidden', 'true');
        en.appendChild(span);
      });

      /* 下划线和中文的起始时间跟着字数走 */
      title.style.setProperty('--st-n', chars.length);
    }
  });

  function reveal(title) { title.classList.add('is-in'); }

  if (dev || !('IntersectionObserver' in window)) {
    titles.forEach(reveal);
    return;
  }

  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      reveal(entry.target);
      io.unobserve(entry.target);   // 只播一次
    });
  }, { rootMargin: '0px 0px -18% 0px', threshold: 0 });

  titles.forEach(function (t) { io.observe(t); });
})();
