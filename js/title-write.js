/* ============================================================
   title-write.js — 04 · 标题一个字母一个字母写出来
   每条 path 读 getTotalLength() 作为 dasharray/dashoffset 初值，
   用 Web Animations API 依次播放：每字母 0.3s ease，间隔 0.12s。
   ============================================================ */

(function () {
  'use strict';

  const LETTER_DUR   = 300;   // 每个字母描完用时
  const LETTER_STEP  = 120;   // 前一个字母起笔到下一个的间隔

  /**
   * 把一条 SVG path 收成"未书写"状态。
   * 提前调用，避免开屏期间标题已经完整露出来。
   */
  function prime(svg) {
    const letters = svg.querySelectorAll('.ltr');
    letters.forEach(function (p) {
      const len = p.getTotalLength();
      p.dataset.len = len;
      p.style.strokeDasharray  = len;
      p.style.strokeDashoffset = len;
    });
    return letters;
  }

  /**
   * 依次书写。返回全部写完所需的总时长（毫秒）。
   */
  function write(svg, onDone) {
    const letters = svg.querySelectorAll('.ltr');
    const reduce  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) {
      // 降级：直接呈现，不做书写
      letters.forEach(function (p) { p.style.strokeDashoffset = 0; });
      if (onDone) onDone();
      return 0;
    }

    letters.forEach(function (p, i) {
      const len = p.dataset.len || p.getTotalLength();
      p.animate(
        [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
        { duration: LETTER_DUR, delay: i * LETTER_STEP, easing: 'ease', fill: 'forwards' }
      );
    });

    const total = (letters.length - 1) * LETTER_STEP + LETTER_DUR;

    setTimeout(function () {
      svg.classList.add('is-written', 'is-bounce');
      svg.addEventListener('animationend', function handler() {
        svg.classList.remove('is-bounce');
        svg.removeEventListener('animationend', handler);
      });
      if (onDone) onDone();
    }, total);

    return total;
  }

  window.TitleWrite = { prime: prime, write: write };
})();
