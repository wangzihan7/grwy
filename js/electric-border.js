/* ============================================================
   electric-border.js — 驱动电流边框的噪声滚动与 hover 加压
   ------------------------------------------------------------
   feOffset 的 dy 和 feDisplacementMap 的 scale 都是 SVG 属性，
   不是 CSS 属性，CSS 过渡不了，所以这两项用 rAF 插值。

   dy 的循环范围必须小于 filter 作用区留出的富余量：feOffset 把噪声图
   上移 dy 之后，作用区底部会空出 dy 那么高一条，那里没有噪声就没有位移，
   边框会被裁出直边。HTML 里 filter 的 height 已按此留足。
   ============================================================ */

(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cards  = Array.prototype.slice.call(document.querySelectorAll('.eb-card'));
  if (!cards.length || reduce) return;

  const DY_SPAN     = 110;   // dy 循环范围，与 filter 作用区的富余量对应
  const BASE_SPEED  = DY_SPAN / 6;   // 6s 滚完一轮
  const BASE_SCALE  = 10;    // ±5px 位移
  const HOVER_SCALE = 18;    // ±9px，像被加大了电压
  const LERP        = 6;     // 插值速度

  const items = cards.map(function (card) {
    const filter = document.getElementById(card.dataset.ebFilter || '');
    if (!filter) return null;
    const disp = filter.querySelector('feDisplacementMap');
    const off  = filter.querySelector('feOffset');
    if (!disp || !off) return null;

    const item = {
      card: card,
      disp: disp,
      off:  off,
      // 起始相位错开，四张卡不会同步抽动
      dy:    Math.random() * DY_SPAN,
      scale: BASE_SCALE,
      speed: BASE_SPEED,
      hot:   false
    };
    card.addEventListener('mouseenter', function () { item.hot = true; });
    card.addEventListener('mouseleave', function () { item.hot = false; });
    return item;
  }).filter(Boolean);

  if (!items.length) return;

  /* 离开视口就停：feTurbulence 是重运算，没必要在看不见的时候烧 GPU */
  let running = false, raf = 0, last = 0;

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  function tick(now) {
    const dt = Math.min((now - last) / 1000, .05);
    last = now;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const k  = Math.min(dt * LERP, 1);

      it.scale += ((it.hot ? HOVER_SCALE : BASE_SCALE) - it.scale) * k;
      it.speed += ((it.hot ? BASE_SPEED * 2 : BASE_SPEED) - it.speed) * k;

      it.dy -= it.speed * dt;
      if (it.dy < 0) it.dy += DY_SPAN;

      it.disp.setAttribute('scale', it.scale.toFixed(2));
      it.off.setAttribute('dy', it.dy.toFixed(1));
    }

    raf = requestAnimationFrame(tick);
  }

  const host = document.getElementById('about') || document.body;
  let inView = false;

  function sync() {
    (inView && !document.hidden) ? start() : stop();
  }

  /* 调试开关 ?dev=1：不等滚动，直接通电 */
  if (new URLSearchParams(location.search).has('dev')) {
    inView = true;
    sync();
  } else if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      sync();
    }, { threshold: 0 }).observe(host);
  } else {
    inView = true;
    sync();
  }

  document.addEventListener('visibilitychange', sync);
})();
