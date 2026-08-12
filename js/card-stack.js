/* ============================================================
   card-stack.js — 第 3 屏 · 后台页面卡堆轮换
   规格 1 卡片怎么叠 / 2 每 5 秒换一张 / 3 索引跟着换
        4 鼠标放上去就停 / 6 第一次进场
   ------------------------------------------------------------
   参照 reactbits 的 CardSwap（MIT）重写，几处关键点照源码对齐：

   1. promoteOverlap = 0.9 在 GSAP 里是 `-=durDrop*0.9`，即从时间轴
      末尾往回退 —— 后面的卡在前卡下坠到 **10%** 处就开始顶上来，
      几乎是同时动。设计稿把它描述成「坠到 90% 时」，照那样写会变成
      先坠完再顶上，节奏完全不同。
   2. 缓动是 elastic.out(0.6, 0.9)：GSAP 里 amplitude<1 等价于把
      period 除以 amplitude，所以实际是 period 1.5 的弹性震荡。
      CSS 的 cubic-bezier 只能超调一次，做不出来，这里用 rAF 插值。
   3. 前卡坠下去之后不是瞬间归位，而是从坠落处平滑飞回队尾（2 秒）。
   4. 三个位移量取设计稿的 56 / 46 / 84，其中 z 正好等于 x×1.5，
      和 CardSwap 的 makeSlot 同一套规律。
   ============================================================ */

(function () {
  'use strict';

  const stack = document.querySelector('.tm3-stack');
  if (!stack) return;

  const cards = Array.prototype.slice.call(stack.querySelectorAll('.tm3-card'));
  const idxs  = Array.prototype.slice.call(document.querySelectorAll('.tm3-idx'));
  const N = cards.length;
  if (!N) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* —— 参数（对应 CardSwap 的 props）—— */
  const DIST_X = 56;          // cardDistance
  const DIST_Y = 46;          // verticalDistance
  const SKEW   = 6;           // skewAmount
  const DELAY  = 5000;        // delay
  const DUR_DROP = 2000, DUR_MOVE = 2000, DUR_RETURN = 2000;
  const PROMOTE_OVERLAP = 0.9;
  const RETURN_DELAY = 0.05;
  const STAGGER = 150;
  const DROP_Y = 500;

  /* elastic.out(0.6, 0.9)：amplitude<1 时 GSAP 把 period 除以 amplitude，
     所以 p2 = 0.9/0.6 = 1.5，p3 = p2/(2π)·asin(1) = 0.375 */
  const P2 = 1.5, P3 = 0.375;
  function elasticOut(t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t - P3) * (2 * Math.PI) / P2) + 1;
  }

  function slot(depth) {
    return {
      x: depth * DIST_X,
      y: -depth * DIST_Y,
      z: -depth * DIST_X * 1.5,
      zIndex: N - depth
    };
  }

  /* 先居中再偏移：CSS transform 从右往左应用 */
  function paint(el, x, y, z) {
    el.style.transform =
      'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,' + z.toFixed(2) + 'px)' +
      ' translate(-50%,-50%) skewY(' + SKEW + 'deg)';
  }
  function setSlot(el, depth) {
    const s = slot(depth);
    el.style.zIndex = String(s.zIndex);
    paint(el, s.x, s.y, s.z);
  }

  /* 每张卡当前的位置，动画都从这里插值出去 */
  const pos = cards.map(function () { return { x: 0, y: 0, z: 0 }; });
  function place(i, depth) {
    const s = slot(depth);
    pos[i] = { x: s.x, y: s.y, z: s.z };
    cards[i].style.zIndex = String(s.zIndex);
    paint(cards[i], s.x, s.y, s.z);
  }

  /* 一条独立的补间：把某张卡从当前位置移到目标位置 */
  const running = {};
  function tween(i, to, dur, delayMs) {
    if (running[i]) cancelAnimationFrame(running[i]);
    const from = { x: pos[i].x, y: pos[i].y, z: pos[i].z };
    const t0 = performance.now() + (delayMs || 0);

    running[i] = requestAnimationFrame(function step(now) {
      const t = Math.min(Math.max((now - t0) / dur, 0), 1);
      const e = reduce ? 1 : elasticOut(t);
      pos[i] = {
        x: from.x + (to.x - from.x) * e,
        y: from.y + (to.y - from.y) * e,
        z: from.z + (to.z - from.z) * e
      };
      paint(cards[i], pos[i].x, pos[i].y, pos[i].z);
      if (t < 1) running[i] = requestAnimationFrame(step);
      else running[i] = 0;
    });
  }

  let order = cards.map(function (_, i) { return i; });
  let timer = 0, paused = false, entered = false;

  function paintIndex() {
    const front = order[0];
    idxs.forEach(function (el, i) {
      el.classList.toggle('is-on', i === front);
      el.setAttribute('aria-current', i === front ? 'true' : 'false');
    });
  }

  function swap(force) {
    /* force：点索引是明确指令，不该被 hover 暂停挡住 */
    if ((!force && paused) || reduce || order.length < 2) return;

    const front = order[0];
    const rest = order.slice(1);
    const elFront = cards[front];

    /* 前卡下坠 */
    tween(front, { x: pos[front].x, y: pos[front].y + DROP_Y, z: pos[front].z }, DUR_DROP, 0);

    /* promote：前卡刚下坠 10% 时后面就开始顶上来 */
    const promoteAt = DUR_DROP * (1 - PROMOTE_OVERLAP);
    rest.forEach(function (ci, i) {
      const s = slot(i);
      setTimeout(function () { cards[ci].style.zIndex = String(s.zIndex); }, promoteAt);
      tween(ci, { x: s.x, y: s.y, z: s.z }, DUR_MOVE, promoteAt + i * STAGGER);
    });

    /* return：前卡从坠落处平滑飞回队尾，看得见它绕回去 */
    const backSlot = slot(N - 1);
    const returnAt = promoteAt + DUR_MOVE * RETURN_DELAY;
    setTimeout(function () {
      elFront.style.zIndex = String(backSlot.zIndex);
      tween(front, { x: backSlot.x, y: backSlot.y, z: backSlot.z }, DUR_RETURN, 0);
    }, returnAt);

    order = rest.concat(front);
    setTimeout(paintIndex, promoteAt);
  }

  /* 包一层再传给 setInterval：直接传 swap 的话，定时器可能把参数
     喂给它的 force，语义就变了 */
  function start() { clearInterval(timer); if (!reduce) timer = setInterval(function () { swap(); }, DELAY); }
  function stop()  { clearInterval(timer); }

  /* 4 · 鼠标移进卡堆就停 —— 后台页面信息密集，
     不给人停下来看的机会就等于没放 */
  stack.addEventListener('mouseenter', function () { paused = true; stop(); });
  stack.addEventListener('mouseleave', function () { paused = false; if (entered) start(); });

  /* 点索引跳到那一张：走的是和自动轮换同一套动画（前卡下坠、后卡顶上），
     隔着 0.9 秒连续触发，直到目标卡站到最前。
     直接把所有卡补间到新位置也能到位，但那是另一种观感，
     和自动切换对不上。 */
  let chain = 0;
  function goTo(target) {
    const at = order.indexOf(target);
    if (at <= 0) return;          // 已经在最前
    clearTimeout(chain);
    stop();

    if (reduce) {                 // 减弱动效时直接落位
      order = order.slice(at).concat(order.slice(0, at));
      order.forEach(function (ci, depth) { place(ci, depth); });
      paintIndex();
      return;
    }

    let left = at;
    (function once() {
      swap(true);
      if (--left > 0) {
        chain = setTimeout(once, 900);
      } else if (entered && !paused) {
        chain = setTimeout(start, DELAY);
      }
    })();
  }

  idxs.forEach(function (el, i) {
    el.addEventListener('click', function () { goTo(i); });
  });

  /* 6 · 第一次进场：三张从右下角依次飞入，最后一张落定后停 1 秒再轮换 */
  function enter() {
    if (entered) return;
    entered = true;
    paintIndex();

    if (reduce) {
      order.forEach(function (ci, depth) { place(ci, depth); cards[ci].style.opacity = '1'; });
      return;
    }

    order.forEach(function (ci, depth) {
      const s = slot(depth);
      pos[ci] = { x: s.x + 90, y: s.y + 70, z: s.z };
      cards[ci].style.zIndex = String(s.zIndex);
      paint(cards[ci], pos[ci].x, pos[ci].y, pos[ci].z);
      setTimeout(function () {
        cards[ci].style.opacity = '1';
        tween(ci, { x: s.x, y: s.y, z: s.z }, 900, 0);
      }, depth * 120);
    });

    setTimeout(start, (N - 1) * 120 + 900 + 1000);
  }

  /* 未进场前先按最终位置摆好（透明），免得布局跳动 */
  order.forEach(function (ci, depth) { place(ci, depth); });

  if (new URLSearchParams(location.search).has('dev')) {
    enter();                       // 调试时不等滚动
  } else if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) { stop(); return; }
      enter();
      io.unobserve(stack);
    }, { threshold: .25 });
    io.observe(stack);
  } else {
    enter();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else if (entered && !paused) start();
  });
})();
