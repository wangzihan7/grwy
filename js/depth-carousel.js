/* ============================================================
   depth-carousel.js — 深度堆叠轮播
   规格 20 一叠卡斜着摊向右后方 / 21 直接拖着翻牌
        22 越往后越暗越糊 / 23 翻牌是有重量的
   ------------------------------------------------------------
   pos 是小数位置，拖动时实时变化，松手后用 power3.out 补完剩下的
   动画停在整数位。这点和作品集的转盘相反：转盘不吸附（一直在转），
   牌堆要吸附（停在某一张）。
   ============================================================ */

(function () {
  'use strict';

  const stage = document.querySelector('.sc-stage');
  if (!stage) return;

  const cards = Array.prototype.slice.call(stage.querySelectorAll('.sc-card'));
  const dots  = Array.prototype.slice.call(document.querySelectorAll('.sc-dot'));
  const N     = cards.length;
  if (!N) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 规格 20 给的三个量。
     spread 设计稿标的是 90，但那是在 Pencil 里平面摆出来的效果，没有透视。
     真实 3D 下 translateZ(-220) 把后面的卡按 1400/(1400+220d) 缩小，
     rotateY 又把右边缘往后收，90 只能露出约 24px —— 编号看不见，
     规格 20 要的「刚好能看到 02、03、04 的编号」就没了。
     130 对应露出约 70px，正好把右上角的编号让出来。 */
  const DEPTH  = 220;    // 每层往后
  const SPREAD = 130;    // 每层向右偏
  const TILT   = 22;     // 每层侧转（度）
  const VISIBLE = 3;     // 模糊按这个数归一化

  const SNAP_MS = reduce ? 0 : 700;   // 23 · 翻牌是有重量的

  let pos = 0;           // 小数位置，循环，不设边界
  let anim = null;       // 当前吸附动画

  const clamp = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };
  const wrap  = function (v, n) { return ((v % n) + n) % n; };
  /* power3.out：起手快、收尾慢，像真的用手把一张牌从堆里抽出来 */
  const power3out = function (t) { return 1 - Math.pow(1 - t, 3); };

  function layout(p) {
    const frontIdx = wrap(Math.round(p), N);

    for (let i = 0; i < N; i++) {
      const card = cards[i];

      /* 循环：把相对位置折到 [-0.5, N-0.5)。
         翻走的卡走到 -0.5 时正好接上 N-0.5（最远处），
         而这两端的透明度都是 0，所以那一下折返看不见。 */
      const d = wrap(i - p + .5, N) - .5;

      const tz = -DEPTH * d;
      const tx = SPREAD * d;
      const ry = TILT * clamp(d, 0, 1);

      card.style.transform =
        'translateX(' + tx.toFixed(2) + 'px) translateZ(' + tz.toFixed(2) + 'px) rotateY(' + ry.toFixed(2) + 'deg)';
      card.style.zIndex = String(Math.round(2000 - d * 20));

      /* 22 · 越往后越暗越糊。
         规格的实现说明里 brightness 和暗罩都写了，但设计稿的 Depth Tint
         图层名标的是「brightness 0.8 / 0.6 / 0.4」—— 那层罩子本身就是在
         表达 brightness，两者全额叠加会黑成一片，对不上设计稿里那三张
         still 能看清轮廓和编号的浅灰卡。这里以罩子为主（取设计稿实测的
         0.22/0.44/0.62 一档），brightness 只留一点点做去饱和。 */
      const dp = Math.max(d, 0);
      card.style.filter =
        'brightness(' + (1 - dp * 0.07).toFixed(3) + ') blur(' + Math.min(6, dp / VISIBLE * 6).toFixed(2) + 'px)';

      const tint = card.querySelector('.sc-card__tint');
      if (tint) tint.style.opacity = clamp(dp * 0.22, 0, .7).toFixed(3);

      /* 两端淡出，折返点才不会突然跳出一张卡 */
      let op = 1;
      if (d < 0) op = Math.max(0, 1 + d * 2);
      else if (d > N - 1) op = Math.max(0, 1 - (d - (N - 1)) * 2);
      card.style.opacity = op.toFixed(3);

      card.classList.toggle('is-front', i === frontIdx);
      card.setAttribute('aria-hidden', i === frontIdx ? 'false' : 'true');
    }

    for (let j = 0; j < dots.length; j++) {
      dots[j].classList.toggle('is-on', j === frontIdx);
      dots[j].setAttribute('aria-selected', j === frontIdx ? 'true' : 'false');
    }
  }

  function setPos(p) { pos = p; layout(pos); }

  /* 23 · 切换用 power3.out、700ms；减弱动效时直接切 */
  function animateTo(target) {
    if (anim) cancelAnimationFrame(anim);
    if (SNAP_MS === 0) { setPos(target); return; }

    const from = pos;
    const diff = target - from;
    if (Math.abs(diff) < .001) { setPos(target); return; }

    const t0 = performance.now();
    (function step(now) {
      const t = Math.min((now - t0) / SNAP_MS, 1);
      setPos(from + diff * power3out(t));
      if (t < 1) anim = requestAnimationFrame(step);
      else anim = null;
    })(t0);
  }

  function go(delta) { animateTo(Math.round(pos) + delta); }

  /* 跳到指定卡：往最近的方向绕，不倒着转一整圈 */
  function goTo(index) {
    const cur = Math.round(pos);
    let delta = index - wrap(cur, N);
    if (delta > N / 2) delta -= N;
    if (delta < -N / 2) delta += N;
    animateTo(cur + delta);
  }

  /* —— 21 · 直接拖着翻牌 ——
     累计位移 ÷ 卡宽 换算成小数位置，全程跟手；
     拖过半张卡的距离就切到下一张（松手后 Math.round 决定落点）。 */
  let dragging = false, startX = 0, startPos = 0, moved = 0, pid = null;

  function cardWidth() {
    const track = stage.querySelector('.sc-track');
    return (track && track.offsetWidth) || 440;
  }

  stage.addEventListener('pointerdown', function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    /* 两侧箭头是独立按钮，按它不算按住卡片 —— 否则抬手时会被当成
       一次点击，翻页的同时又把弹层打开了 */
    if (e.target.closest && e.target.closest('.sc-arrow')) return;
    dragging = true;
    moved = 0;
    startX = e.clientX;
    startPos = pos;
    pid = e.pointerId;
    stage.classList.add('is-dragging');
    if (anim) { cancelAnimationFrame(anim); anim = null; }
    stage.setPointerCapture && stage.setPointerCapture(pid);
  });

  stage.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    const dx = e.clientX - startX;
    moved = Math.abs(dx);
    /* 往右拖 = 回上一张，所以取负。循环轮播，不设边界 */
    setPos(startPos - dx / cardWidth());
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove('is-dragging');
    if (pid !== null && stage.releasePointerCapture) {
      try { stage.releasePointerCapture(pid); } catch (err) {}
    }
    pid = null;

    /* 位移没过阈值就当成一次点击：把最前那张交给弹层。
       click 事件在这里不可靠 —— setPointerCapture 会把后续事件
       重定向到 stage，绑在卡片上的 click 根本收不到。 */
    if (moved <= 6) {
      animateTo(Math.round(pos));
      const front = cards[wrap(Math.round(pos), N)];
      if (front) {
        stage.dispatchEvent(new CustomEvent('sc:activate', { detail: { card: front } }));
      }
      return;
    }
    animateTo(Math.round(pos));   // 补完剩下的动画停在整数位
  }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('lostpointercapture', endDrag);

  /* 两侧箭头和圆点是真正的 button，它们的 click 不该被当成"点卡片" */
  stage.addEventListener('click', function (e) {
    if (e.target.closest('.sc-arrow')) return;
    e.stopPropagation();
  }, true);

  /* —— 滚轮横滚 —— */
  let wheelLock = false;
  stage.addEventListener('wheel', function (e) {
    /* 只接管横向滚动，竖向留给页面 */
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    if (wheelLock) return;
    wheelLock = true;
    go(e.deltaX > 0 ? 1 : -1);
    setTimeout(function () { wheelLock = false; }, 260);
  }, { passive: false });

  /* —— 左右方向键，回车 / 空格打开详情 —— */
  stage.setAttribute('tabindex', '0');
  stage.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const front = cards[wrap(Math.round(pos), N)];
      if (front) stage.dispatchEvent(new CustomEvent('sc:activate', { detail: { card: front } }));
    }
  });

  /* —— 两侧箭头与底部圆点 —— */
  const prev = document.querySelector('.sc-arrow--prev');
  const next = document.querySelector('.sc-arrow--next');
  if (prev) prev.addEventListener('click', function () { go(-1); });
  if (next) next.addEventListener('click', function () { go(1); });
  dots.forEach(function (dot, i) {
    dot.addEventListener('click', function () { goTo(i); });
  });

  /* 调试开关 ?card=3：直接从第 4 张开始，用来看循环后首卡背后是否还有三张 */
  const startAt = Number(new URLSearchParams(location.search).get('card')) || 0;
  setPos(startAt);

  window.DepthCarousel = {
    get index() { return wrap(Math.round(pos), N); },
    cards: cards,
    to: goTo
  };
})();
