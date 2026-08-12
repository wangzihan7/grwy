/* ============================================================
   count-up.js — 规格 2 · 数字滚动
   ------------------------------------------------------------
   数字从 0 快速滚到目标值，0.8 秒内完成，越到后面越慢
   （easeOutExpo）。配合 CSS 的 tabular-nums 等宽数字，
   滚动过程中宽度不跳。
   ============================================================ */

(function () {
  'use strict';

  const nums = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
  if (!nums.length) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DUR = 800;

  function easeOutExpo(t) {
    return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  function run(el) {
    const target = Number(el.dataset.count) || 0;
    if (reduce) { el.textContent = String(target); return; }

    const t0 = performance.now();
    (function step(now) {
      const t = Math.min((now - t0) / DUR, 1);
      el.textContent = String(Math.round(target * easeOutExpo(t)));
      if (t < 1) requestAnimationFrame(step);
    })(t0);
  }

  if (!('IntersectionObserver' in window)) {
    nums.forEach(run);
    return;
  }

  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      run(entry.target);
      io.unobserve(entry.target);     // 只滚一次
    });
  }, { threshold: .6 });

  nums.forEach(function (el) {
    el.textContent = '0';
    io.observe(el);
  });
})();
