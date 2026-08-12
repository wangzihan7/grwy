/* ============================================================
   step-focus.js — 第 2 屏规格 3 · 鼠标指到哪台，右边就亮哪组
   ------------------------------------------------------------
   手机与右侧文字组共用 data-step="1|2|3"，hover 任一方都给容器
   加 .focus-N —— 双向的，因为看的人有时先看图、有时先看字。
   ============================================================ */

(function () {
  'use strict';

  const root = document.getElementById('tm2');
  if (!root) return;

  const KEYS = ['1', '2', '3'];
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function focus(k) { KEYS.forEach(function (x) { root.classList.toggle('focus-' + x, x === k); }); }
  function clear()  { KEYS.forEach(function (x) { root.classList.remove('focus-' + x); }); }

  Array.prototype.forEach.call(root.querySelectorAll('[data-step]'), function (el) {
    const key = el.dataset.step;
    if (fine) {
      el.addEventListener('mouseenter', function () { focus(key); });
      el.addEventListener('mouseleave', clear);
    }
    el.addEventListener('focus', function () { focus(key); }, true);
    el.addEventListener('blur', clear, true);
  });
})();
