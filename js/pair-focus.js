/* ============================================================
   pair-focus.js — 规格 3 ★ 痛点和解法互相点亮
   ------------------------------------------------------------
   痛点行、曲线、解法标签共用 data-pair="01|02|03"。
   鼠标移到任意一方，就给这一屏容器加 .focus-01/02/03，
   剩下的压暗与提亮全由 CSS 负责。

   三条曲线本来就是「哪个痛点通向哪个解法」的答案，
   hover 只是把它点出来。

   触摸设备没有 hover：改成点击切换，并默认高亮第一组，
   否则一进来三组都是暗的，看不出这里可以点。
   ============================================================ */

(function () {
  'use strict';

  const root = document.getElementById('tm1');
  if (!root) return;

  const KEYS = ['01', '02', '03'];
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function focus(key) {
    KEYS.forEach(function (k) { root.classList.toggle('focus-' + k, k === key); });
  }
  function clear() {
    KEYS.forEach(function (k) { root.classList.remove('focus-' + k); });
  }

  const targets = root.querySelectorAll('.tm1-pain[data-pair], .tm1-fix[data-pair]');

  Array.prototype.forEach.call(targets, function (el) {
    const key = el.dataset.pair;

    if (fine) {
      el.addEventListener('mouseenter', function () { focus(key); });
      el.addEventListener('mouseleave', clear);
    } else {
      /* 触摸设备：点一下切过去，再点一下也不取消 —— 始终有一组是亮的 */
      el.addEventListener('click', function () { focus(key); });
    }

    /* 键盘同样能走一遍这三组 */
    el.addEventListener('focus', function () { focus(key); });
    el.addEventListener('blur', clear);
  });

  if (!fine) focus('01');
})();
