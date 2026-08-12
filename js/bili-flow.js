/* ============================================================
   bili-flow.js — 规格 2 ★ 右边那张流程图自己在转
   ------------------------------------------------------------
   四个节点按顺序描边点亮，节点之间的箭头同步画出：
     retrieve → grade_documents → generate → 回答

   每跑三轮，走一次纠错分支：判断那里转成橙色，线画到
   transform_query、节点亮起，再沿左边那条长回环画回最上面的
   retrieve，重新跑一遍。

   这个系统最值钱的就是这个环，让它真的转起来，
   比画在那儿有说服力得多。
   ============================================================ */

(function () {
  'use strict';

  const flow = document.querySelector('.bili-flow');
  if (!flow) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const nodes = {};
  Array.prototype.forEach.call(flow.querySelectorAll('[data-node]'), function (el) {
    nodes[el.dataset.node] = el;
  });
  const edges = {};
  Array.prototype.forEach.call(flow.querySelectorAll('[data-edge]'), function (el) {
    edges[el.dataset.edge] = el;
  });
  const loop = flow.querySelector('.flow-loop');

  /* 正常轮 2.4s 分四步；纠错轮 3.8s，多出来的时间给回环画线和停顿 */
  const NORMAL = [
    { on: ['retrieve'],        edge: null,       ms: 600 },
    { on: ['e1', 'grade'],     edge: 'e1',       ms: 600 },
    { on: ['e2', 'generate'],  edge: 'e2',       ms: 600 },
    { on: ['e3', 'end'],       edge: 'e3',       ms: 600 }
  ];
  const RETRY = [
    { on: ['retrieve'],        edge: null,       ms: 600 },
    { on: ['e1', 'grade'],     edge: 'e1',       ms: 600 },
    { on: ['branch', 'transform'], edge: 'branch', ms: 800 },
    { on: [], edge: null, ms: 1800, drawLoop: true }   /* 画回环 0.8s + 停 0.6s + 淡出 */
  ];

  let timer = 0, running = false, round = 0, step = 0, seq = NORMAL;

  function clearAll() {
    Object.keys(nodes).forEach(function (k) { nodes[k].classList.remove('is-lit'); });
    Object.keys(edges).forEach(function (k) { edges[k].classList.remove('is-lit'); });
  }

  function apply(s) {
    clearAll();
    s.on.forEach(function (k) {
      if (nodes[k]) nodes[k].classList.add('is-lit');
      if (edges[k]) edges[k].classList.add('is-lit');
    });
    if (s.drawLoop && loop) {
      loop.classList.remove('is-fading');
      loop.classList.add('is-drawing');
      /* 画完停 0.6s 再淡出 */
      setTimeout(function () {
        loop.classList.add('is-fading');
        loop.classList.remove('is-drawing');
      }, 1400);
    }
  }

  function tick() {
    if (!running) return;
    apply(seq[step]);
    const ms = seq[step].ms;
    step++;
    if (step >= seq.length) {
      step = 0;
      round++;
      /* 按 3:1 交替：跑三轮正常的，走一轮纠错的 */
      seq = (round % 4 === 3) ? RETRY : NORMAL;
    }
    timer = setTimeout(tick, ms);
  }

  function start() {
    if (running || reduce) return;
    running = true;
    tick();
  }
  function stop() {
    running = false;
    clearTimeout(timer);
  }

  /* 3 · hover 橙色那条路：整条回环加深，主链路压到 40% */
  const retryEls = flow.querySelectorAll('.bili-node--retry, .flow-retry, .bili-flow__tag--retry');
  Array.prototype.forEach.call(retryEls, function (el) {
    el.addEventListener('mouseenter', function () { flow.classList.add('focus-retry'); });
    el.addEventListener('mouseleave', function () { flow.classList.remove('focus-retry'); });
  });

  if (reduce) {
    /* 降级：全部节点亮态，回环完整画出但不再循环 */
    Object.keys(nodes).forEach(function (k) { nodes[k].classList.add('is-lit'); });
    Object.keys(edges).forEach(function (k) { edges[k].classList.add('is-lit'); });
    return;
  }

  /* 调试开关 ?flowstep=2：定在某一步不动，方便确认点亮态够不够明显。
     0~3 是正常轮的四步，r0~r3 是纠错轮。 */
  const force = new URLSearchParams(location.search).get('flowstep');
  if (force !== null) {
    const isRetry = force.charAt(0) === 'r';
    const list = isRetry ? RETRY : NORMAL;
    const idx = Math.min(Math.max(parseInt(isRetry ? force.slice(1) : force, 10) || 0, 0), list.length - 1);
    apply(list[idx]);
    return;
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries[0].isIntersecting ? start() : stop();
    }, { threshold: .2 }).observe(flow);
  } else {
    start();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else start();
  });
})();
