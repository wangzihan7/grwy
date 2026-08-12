/* ============================================================
   main.js — 开屏进度、揭幕、Hero 入场编排
   02 手绘进度条 / 03 揭幕 / 11 往下看看
   ============================================================ */

(function () {
  'use strict';

  const loader   = document.getElementById('loader');
  const fill     = document.getElementById('loaderFill');
  const percent  = document.getElementById('loaderPercent');
  const hero     = document.querySelector('.hero');
  const title    = document.getElementById('heroTitle');
  const hint     = document.getElementById('scrollHint');

  const reduce   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 调试开关（正式使用不受影响）：
     ?loader=slow  开屏放慢到 8 秒，看清小人和进度条
     ?loader=hold  停在开屏不揭幕
     ?loader=skip  跳过开屏，直接进 Hero */
  const mode    = new URLSearchParams(location.search).get('loader');
  const BAR_DUR = mode === 'slow' ? 8000 : 2000;

  // 标题先收成"未书写"状态，免得开屏期间就露在下面
  if (title && window.TitleWrite) window.TitleWrite.prime(title);

  // 小人手上那道橘色轨迹：实测路径长度，dasharray 才能刚好画完一遍
  document.querySelectorAll('.mascot__trail').forEach(function (p) {
    p.style.setProperty('--len', p.getTotalLength());
  });

  /* —— 02 · 进度条与百分比用同一个时钟，保证数字和宽度不脱节 —— */
  function easeInOut(t) {
    return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function runLoader(done) {
    if (reduce || mode === 'skip' || !loader) { if (loader) loader.remove(); done(); return; }

    /* 开屏这几秒锁住滚动，免得揭幕后人已经在页面中间 */
    document.body.classList.add('is-loading');

    const start = performance.now();
    (function tick(now) {
      const t = Math.min((now - start) / BAR_DUR, 1);
      const v = easeInOut(t);
      fill.style.width = (v * 100).toFixed(2) + '%';
      percent.textContent = Math.round(v * 100);
      if (t < 1) requestAnimationFrame(tick);
      else if (mode !== 'hold') done();
    })(start);
  }

  /* —— 03 · 揭幕：整层向上淡出，首页内容同时开始入场，重叠 0.8s —— */
  function reveal() {
    /* 只有真播了开屏才置顶 —— skip / dev 模式下要允许直接定位到某个板块。
       走 head 里那个 jumpTop：它会临时关掉 scroll-behavior:smooth，
       直接落在顶部，不会让人看到一段滑动。 */
    const played = document.body.classList.contains('is-loading');
    document.body.classList.remove('is-loading');
    if (played && window.__jumpTop) window.__jumpTop();

    if (loader) {
      loader.classList.add('is-done');
      // 淡出结束后移出 DOM，避免透明层挡住点击
      setTimeout(function () { loader.remove(); }, 850);
    }
    enterHero();
  }

  /* —— Hero 入场编排 —— */
  function enterHero() {
    if (!hero) return;
    hero.classList.add('is-in');

    if (reduce) {
      if (title && window.TitleWrite) window.TitleWrite.write(title);
      hero.classList.add('is-highlighted', 'is-cta-in');
      return;
    }

    // 小人落位之后再起笔，避免两件事挤在一起
    setTimeout(function () {
      window.TitleWrite.write(title, function () {
        // 06 · 荧光笔在标题写完后从左往右刷出
        hero.classList.add('is-highlighted');
        setTimeout(function () { hero.classList.add('is-cta-in'); }, 320);
      });
    }, 300);
  }

  // 进度跑完 + 页面资源就绪，两者都满足才揭幕
  let barDone = false, pageDone = false;
  function maybeReveal() { if (barDone && pageDone) reveal(); }

  runLoader(function () { barDone = true; maybeReveal(); });

  if (document.readyState === 'complete') {
    pageDone = true;
  } else {
    window.addEventListener('load', function () { pageDone = true; maybeReveal(); });
    // 兜底：资源卡住也不能一直停在开屏
    setTimeout(function () { pageDone = true; maybeReveal(); }, 6000);
  }
  maybeReveal();

  /* —— 11 · 往下看看：点击滚到关于我，页面一滚就淡出 —— */
  if (hint) {
    hint.addEventListener('click', function () {
      /* 程序触发的滚动，别让导航栏收起来 */
      if (window.Navbar && window.Navbar.lock) window.Navbar.lock(1000);
      const about = document.getElementById('about');
      if (about) about.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
    });

    let hintTicking = false;
    window.addEventListener('scroll', function () {
      if (hintTicking) return;
      hintTicking = true;
      requestAnimationFrame(function () {
        hint.classList.toggle('is-faded', window.scrollY > 100);
        hintTicking = false;
      });
    }, { passive: true });
  }

  /* —— 08 · 按钮松开鼠标时抖一下 —— */
  document.querySelectorAll('.btn-hand').forEach(function (btn) {
    btn.addEventListener('mouseleave', function () {
      if (reduce) return;
      btn.classList.add('is-wiggle');
      setTimeout(function () { btn.classList.remove('is-wiggle'); }, 420);
    });
  });
})();
