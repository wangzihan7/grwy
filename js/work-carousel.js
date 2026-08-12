/* ============================================================
   work-carousel.js — 3D 圆柱旋转木马
   规格 27 五件作品围成一个环 / 28 点卡片滚到那一段 / 29 滚到哪件转盘转到哪件
   ------------------------------------------------------------
   五张卡贴在圆柱面上跟着一起转：rotateY(θ) translateZ(R)。
   侧面的卡是斜的、压成梯形，转到背面文字会镜像 —— 立体感来自这里。

   半径给得比"刚好不重叠"大不少：五张卡等分 72°，不重叠的下限约是
   (W/2)/tan(36°) ≈ 248px，这里取 460，卡与卡之间才留得出空当。

   注：设计稿的实现说明原本要求「不用 rotateY、卡片永远直立」，
   看过两种效果的实物对比之后改成了这版真 3D。二维模拟那版的算法
   完整留在 _compare-carousel.html 里，要换回去可以直接取。
   ============================================================ */

(function () {
  'use strict';

  const stage = document.querySelector('.wk-stage');
  const track = document.querySelector('.wk-track');
  if (!stage || !track) return;

  const cards = Array.prototype.slice.call(track.querySelectorAll('.wk-card'));
  const dots  = Array.prototype.slice.call(document.querySelectorAll('.wk-dot'));
  const N     = cards.length;
  if (!N) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = window.matchMedia('(max-width: 900px)');

  const STEP    = 360 / N;   // 72°
  /* 圆柱半径。五张卡等分 72°，"刚好不重叠"的下限约 (W/2)/tan(36°) ≈ 248px。
     580 太散、卡之间空得慌，500 是留出空当又不至于散开的一档。 */
  const RADIUS  = 500;
  const SPIN_MS = 40000;     // 40s 一圈
  const HOT_COS = 0.25;      // cos 大于它才可点：正对那张和它左右两张

  const rad = Math.PI / 180;

  stage.style.setProperty('--wk-r', RADIUS + 'px');

  let phase = 0;          // 当前相位（度）
  let paused = false;     // hover 时暂停自转
  let raf = 0, last = 0;
  let inView = false;

  function layout() {
    for (let i = 0; i < N; i++) {
      const card = cards[i];
      const theta = (i * STEP + phase) % 360;
      const cos = Math.cos(theta * rad);
      const depth = (1 - cos) / 2;          // 0 最近 1 最远

      card.style.transform =
        'rotateY(' + theta.toFixed(2) + 'deg) translateZ(' + RADIUS + 'px)';
      /* 背面那两张压得很淡：它们的文字是镜像的，只当层次用，
         不该抢正面的注意力 */
      card.style.opacity = (1 - depth * 0.82).toFixed(3);
      card.classList.toggle('is-hot', cos > HOT_COS);
    }

    const front = frontIndex();
    for (let j = 0; j < dots.length; j++) {
      dots[j].classList.toggle('is-on', j === front);
      dots[j].setAttribute('aria-selected', j === front ? 'true' : 'false');
    }
  }

  /* 相位 p 时哪张卡最正对：i·STEP + phase ≡ 0 */
  function frontIndex() {
    let best = 0, bestCos = -2;
    for (let i = 0; i < N; i++) {
      const c = Math.cos((i * STEP + phase) * rad);
      if (c > bestCos) { bestCos = c; best = i; }
    }
    return best;
  }

  /* —— 27 · 环一直在转 ——
     θ 递减 = 卡片整体向左移动 = 右侧的卡依次转进中间，
     和规格里写的转动顺序一致（也符合从右往左读的直觉）。 */
  function tick(now) {
    const dt = Math.min(now - last, 60);
    last = now;
    if (!paused && !dragging) {
      phase = (phase - 360 * dt / SPIN_MS) % 360;
      if (phase < 0) phase += 360;
      layout();
    }
    raf = requestAnimationFrame(tick);
  }
  function start() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  /* —— 拖拽接管：拖多少转多少，全程跟手；
        松开后从当前角度接着慢慢自转，不吸附 —— */
  let dragging = false, startX = 0, startPhase = 0, moved = 0, pid = null;

  stage.addEventListener('pointerdown', function (e) {
    if (narrow.matches) return;                    // 窄屏是原生横滑
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true;
    moved = 0;
    startX = e.clientX;
    startPhase = phase;
    pid = e.pointerId;
    stage.classList.add('is-dragging');
    stage.setPointerCapture && stage.setPointerCapture(pid);
  });

  stage.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    const dx = e.clientX - startX;
    moved = Math.abs(dx);
    /* 手往哪边走，卡片就往哪边走。
       卡片的水平位置是 x = R·sin(θ)，θ 增大则右移，所以 dx 直接加。 */
    phase = (startPhase + dx * 0.26) % 360;
    if (phase < 0) phase += 360;
    layout();
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove('is-dragging');
    if (pid !== null && stage.releasePointerCapture) {
      try { stage.releasePointerCapture(pid); } catch (err) {}
    }
    pid = null;

    /* 没怎么动就是一次点击。
       不能用 e.target —— setPointerCapture 会把 pointerup 的 target
       一并重定向到 stage，closest('.wk-card') 永远是 null。
       改用坐标反查：elementFromPoint 会自动跳过 pointer-events:none 的
       卡，所以拿到的一定是"能看清的那几张"之一。 */
    if (moved <= 6 && e) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const card = (el && el.closest) ? el.closest('.wk-card') : null;
      if (card) goToSection(card);
    }
  }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  /* hover 某张卡时暂停自转，方便看清再点 */
  stage.addEventListener('pointerover', function (e) {
    if (e.target.closest && e.target.closest('.wk-card.is-hot')) paused = true;
  });
  stage.addEventListener('pointerout', function (e) {
    if (!e.relatedTarget || !stage.contains(e.relatedTarget)) paused = false;
    else if (!e.relatedTarget.closest('.wk-card.is-hot')) paused = false;
  });

  /* —— 28 · 点卡片，页面滚到它那一段 —— */
  function goToSection(card) {
    const id = card.dataset.target;
    const target = id && document.getElementById(id);
    if (!target) return;
    /* 这一下是程序在滚，别让导航栏把自己收起来 */
    if (window.Navbar && window.Navbar.lock) window.Navbar.lock(1000);
    history.pushState(null, '', '#' + id);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* 把某一张转到正对 */
  function spinTo(index) {
    const want = (360 - index * STEP) % 360;
    let diff = (want - phase) % 360;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    if (reduce) { phase = want; layout(); return; }

    const from = phase, t0 = performance.now(), DUR = 700;
    (function step(now) {
      const t = Math.min((now - t0) / DUR, 1);
      const e = 1 - Math.pow(1 - t, 3);
      phase = (from + diff * e + 360) % 360;
      layout();
      if (t < 1) requestAnimationFrame(step);
    })(t0);
  }

  dots.forEach(function (dot, i) {
    dot.addEventListener('click', function () {
      spinTo(i);
      const card = cards[i];
      if (card) goToSection(card);
    });
  });

  /* 转盘离开视口就停掉整个 rAF，不在看不见的时候空转 */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      (inView && !document.hidden) ? start() : stop();
    }, { threshold: 0 }).observe(stage);
  } else {
    inView = true;
    start();
  }

  /* 规格 29「滚到哪件转盘就转到哪件」已按要求撤掉：
     页面往下滚时转盘会被猛地拨到某个角度，打断它自己的匀速自转，
     视觉上像是滚动在拽着它转。现在滚动和转盘互不干扰，
     转盘只受自转、拖拽、点圆点三件事影响。 */

  document.addEventListener('visibilitychange', function () {
    (inView && !document.hidden) ? start() : stop();
  });

  /* 窄屏用原生横滑，3D 全部关掉 */
  function applyMode() {
    if (narrow.matches) {
      stop();
      track.style.transform = 'none';
      cards.forEach(function (c) {
        c.style.transform = '';
        c.style.opacity = '';
        c.classList.add('is-hot');
      });
    } else {
      track.style.transform = '';
      layout();
      if (inView) start();
    }
  }
  narrow.addEventListener('change', applyMode);

  cards.forEach(function (card) {
    card.addEventListener('click', function (e) {
      if (!narrow.matches) return;   // 宽屏走 pointerup 那条路
      e.preventDefault();
      goToSection(card);
    });
  });

  layout();
  applyMode();

  window.WorkCarousel = { spinTo: spinTo, get phase() { return phase; } };
})();
