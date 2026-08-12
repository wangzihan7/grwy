/* ============================================================
   about.js — 14 · 两组卡片先后落位
   IntersectionObserver 只触发一次：滚回去再滚回来不重播，
   规格 47「任何元素进场只播一次」。
   各元素的先后顺序写在 HTML 的 --rd 上。
   ============================================================ */

(function () {
  'use strict';

  const about = document.getElementById('about');
  if (!about) return;

  /* 调试开关 ?dev=1：跳过滚动触发，直接把入场态置为完成。
     改样式时不用每次滚半天。 */
  if (new URLSearchParams(location.search).has('dev')) {
    about.classList.add('is-revealed');
    return;
  }

  if (!('IntersectionObserver' in window)) {
    about.classList.add('is-revealed');
    return;
  }

  const io = new IntersectionObserver(function (entries) {
    if (!entries[0].isIntersecting) return;
    about.classList.add('is-revealed');
    io.disconnect();
  }, { rootMargin: '0px 0px -15% 0px', threshold: 0 });

  io.observe(about);
})();
