/* ============================================================
   evo-loop.js — 规格 54 · 自进化回路上有一颗光点在跑
   ------------------------------------------------------------
   光点沿回路匀速跑圈，经过哪个节点哪个节点就亮一下；
   跑到第 05 步「人工逐条确认」停顿 0.6 秒 ——
   那是整圈里唯一需要人点头的一步。

   为什么不用 SMIL 的 animateMotion 配 CSS animation-delay：
   那是两套时钟（SMIL 时钟和 CSS 时钟），起始时刻对不齐、
   长时间还会各自漂移，结果就是球跑到 03、亮的却是 04。
   这里改成一个 rAF 时间源同时驱动两者，而且节点亮不亮直接由
   光点在路径上的实际距离判定 —— 位置对上了才亮，天然同步。
   ============================================================ */

(function () {
  'use strict';

  const evo = document.querySelector('.fl-evo');
  if (!evo) return;

  const track  = evo.querySelector('.fl-evo__track');
  const runner = evo.querySelector('.fl-evo__runner');
  const nodes  = Array.prototype.slice.call(evo.querySelectorAll('.fl-evo__node'));
  if (!track || !runner || !nodes.length) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const PERIOD = 12000;            // 一圈 12 秒
  const STOP_AT = 0.684;           // 第 05 步在路径的 68.4% 处
  const T_STOP_IN = 0.65;          // 走到那儿用掉 65% 的时间
  const T_STOP_OUT = 0.70;         // 停到 70%（即 0.6 秒）
  /* 六个节点在路径上的位置：回路总长 2388 = 上边 880 + 右半圆 314
     + 下边 880 + 左半圆 314，各节点距起点的比例。
     路径从 (160,104) 起沿上边向右，所以上边节点的距离就是 x-160，
     下边节点则要先走完上边和右半圆（1194）再回头算。
     ——— 节点横坐标一改，这里必须跟着改，否则球跑到 03、亮的是 04 */
  const NODE_AT = [0.025, 0.184, 0.343, 0.525, 0.684, 0.843];
  const NEAR = 0.022;              // 进入这个范围就算「经过」

  const len = track.getTotalLength();

  /* 时间 → 路径距离，中间那段是停顿 */
  function distAt(t) {
    if (t <= T_STOP_IN)  return t / T_STOP_IN * STOP_AT;
    if (t <= T_STOP_OUT) return STOP_AT;
    return STOP_AT + (t - T_STOP_OUT) / (1 - T_STOP_OUT) * (1 - STOP_AT);
  }

  function paint(d) {
    const p = track.getPointAtLength(d * len);
    runner.setAttribute('transform', 'translate(' + p.x.toFixed(2) + ' ' + p.y.toFixed(2) + ')');

    for (let i = 0; i < nodes.length; i++) {
      /* 环形距离：首尾要能绕过去 */
      let gap = Math.abs(d - NODE_AT[i]);
      if (gap > 0.5) gap = 1 - gap;
      nodes[i].classList.toggle('is-lit', gap < NEAR);
    }
  }

  if (reduce) {
    paint(0);                       // 静止在起点，节点保持常态
    return;
  }

  let raf = 0, t0 = 0, running = false;

  function tick(now) {
    if (!t0) t0 = now;
    paint(distAt(((now - t0) % PERIOD) / PERIOD));
    raf = requestAnimationFrame(tick);
  }
  function start() {
    if (running) return;
    running = true;
    t0 = 0;
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  paint(0);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries[0].isIntersecting ? start() : stop();
    }, { threshold: .12 }).observe(evo);
  } else {
    start();
  }

  document.addEventListener('visibilitychange', function () {
    document.hidden ? stop() : start();
  });
})();
