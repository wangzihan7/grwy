/* ============================================================
   flow-steps.js — 规格 49 五个环节自动依次点亮 / 50 鼠标移上去就接管
                   52 跑完一圈中间的成片亮一下
   ------------------------------------------------------------
   线 A（波浪时间轴）和线 B（环形轨道）共用这一个函数，
   只传入不同的起始 delay —— 两张图的节奏错开，不会同步跳动。

   接管规则：鼠标移到任意节点或它的说明卡上，轮播立刻停在那一步并点亮它；
   移开 1 秒后从当前这步继续往下走，不会跳回开头。
   ============================================================ */

(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const STEP_MS  = 2000;   // 每步停留
  const REST_MS  = 2000;   // 走完一轮额外停顿
  const RESUME_MS = 1000;  // 移开后多久恢复

  function setup(root, startDelay) {
    const nodes = Array.prototype.slice.call(root.querySelectorAll('.fl-node'));
    const boxes = Array.prototype.slice.call(root.querySelectorAll('.fl-box'));
    const core  = root.querySelector('.fl-core');
    const n = nodes.length;
    if (!n) return;

    let active = 0;
    let timer = 0, resumeTimer = 0, hovering = false, running = false;

    function paint() {
      for (let i = 0; i < n; i++) {
        nodes[i].classList.toggle('is-on', i === active);
        if (boxes[i]) boxes[i].classList.toggle('is-on', i === active);
      }
      /* 52 · 第 05 步「分发」亮起时，中心那台成片同步亮一次 */
      if (core) core.classList.toggle('is-lit', active === n - 1);
    }

    function next() {
      active = (active + 1) % n;
      paint();
      /* 走完一轮多停一会儿再从头来 */
      schedule(active === 0 ? STEP_MS + REST_MS : STEP_MS);
    }

    function schedule(ms) {
      clearTimeout(timer);
      if (hovering || reduce) return;
      timer = setTimeout(next, ms);
    }

    function play() {
      if (running) return;
      running = true;
      paint();
      schedule(STEP_MS + startDelay);
    }
    function halt() {
      running = false;
      clearTimeout(timer);
      clearTimeout(resumeTimer);
    }

    /* 50 · hover 接管 */
    function bindTakeover(el, index) {
      el.addEventListener('mouseenter', function () {
        hovering = true;
        clearTimeout(timer);
        clearTimeout(resumeTimer);
        active = index;
        paint();
      });
      el.addEventListener('mouseleave', function () {
        hovering = false;
        clearTimeout(resumeTimer);
        /* 从当前这步继续往下走，不跳回开头 */
        resumeTimer = setTimeout(function () { schedule(0); }, RESUME_MS);
      });
      /* 键盘也能定位到某一步 */
      el.addEventListener('focus', function () { hovering = true; active = index; paint(); });
      el.addEventListener('blur', function () {
        hovering = false;
        resumeTimer = setTimeout(function () { schedule(0); }, RESUME_MS);
      });
    }
    nodes.forEach(bindTakeover);
    boxes.forEach(bindTakeover);

    paint();

    /* 离开视口就停，别在看不见的地方空转 */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting ? play() : halt();
      }, { threshold: .15 }).observe(root);
    } else {
      play();
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) halt();
      else if (!running) play();
    });
  }

  /* 两张图起步错开 1 秒 */
  const flows = document.querySelectorAll('[data-flow]');
  Array.prototype.forEach.call(flows, function (el, i) {
    setup(el, i * 1000);
  });
})();
