/* ============================================================
   cursor.js — 10 · 铅笔跟着鼠标
   光标变成橘色小圆点，后面拖一串逐渐变小变淡的彩色残点，
   像铅笔划过纸面留下的痕迹。
   ============================================================ */

(function () {
  'use strict';

  const COLORS     = ['#FF6B35', '#FFD23F', '#4ECDC4', '#95E1D3', '#FF85A2', '#C7A5FF'];
  const TRAIL_GAP  = 30;    // 每 30ms 生成一个残点
  const TRAIL_LIFE = 600;   // 残点 0.6s 内消失

  const fine   = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!fine || reduce) return;

  document.body.classList.add('pencil-cursor');

  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  document.body.appendChild(dot);

  let x = 0, y = 0, lastTrail = 0, colorIndex = 0, active = false;

  document.addEventListener('mousemove', function (e) {
    x = e.clientX;
    y = e.clientY;

    if (!active) {
      active = true;
      dot.classList.add('on');
    }
    dot.style.transform = 'translate(' + x + 'px,' + y + 'px)';

    const now = performance.now();
    if (now - lastTrail < TRAIL_GAP) return;
    lastTrail = now;
    spawnTrail(x, y);
  }, { passive: true });

  document.addEventListener('mouseleave', function () {
    active = false;
    dot.classList.remove('on');
  });

  function spawnTrail(px, py) {
    const t = document.createElement('div');
    t.className = 'cursor-trail';
    t.style.background = COLORS[colorIndex];
    t.style.transform  = 'translate(' + px + 'px,' + py + 'px)';
    colorIndex = (colorIndex + 1) % COLORS.length;
    document.body.appendChild(t);

    t.animate(
      [
        { transform: 'translate(' + px + 'px,' + py + 'px) scale(1)', opacity: .9 },
        { transform: 'translate(' + px + 'px,' + py + 'px) scale(0)', opacity: 0 }
      ],
      { duration: TRAIL_LIFE, easing: 'ease-out', fill: 'forwards' }
    ).onfinish = function () { t.remove(); };
  }
})();
