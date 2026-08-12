/* ============================================================
   work-detail.js — 作品详情段落的进场触发
   每段只播一次（规格 47）。段内各元素的先后顺序写在 CSS 的
   transition-delay 上，这里只负责在合适的时机加 .is-in。

   入场结束后再加一个 .is-settled：那些 transition-delay 是给
   入场排序用的，留着会拖慢之后的 hover —— 鼠标移上去要等一秒
   多才变色，就是因为元素上还挂着入场时的 delay。
   ============================================================ */

(function () {
  'use strict';

  const sections = Array.prototype.slice.call(document.querySelectorAll('.wd'));
  if (!sections.length) return;

  /* 段内最长的一条入场链约 2.6s（教师第 1 屏的解法标签），留点余量 */
  const SETTLE_MS = 3000;

  function enter(el) {
    el.classList.add('is-in');
    setTimeout(function () { el.classList.add('is-settled'); }, SETTLE_MS);
  }

  if (new URLSearchParams(location.search).has('dev') || !('IntersectionObserver' in window)) {
    sections.forEach(enter);
    return;
  }

  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      enter(entry.target);
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -18% 0px', threshold: 0 });

  sections.forEach(function (s) { io.observe(s); });
})();
