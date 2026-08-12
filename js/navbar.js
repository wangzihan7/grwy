/* ============================================================
   navbar.js — 顶部栏当前板块指示
   1 激活样式 / 2 scrollspy / 3 切换过渡 / 4 点击与吸顶
   ============================================================ */

(function () {
  'use strict';

  const navbar = document.getElementById('navbar');
  const items  = Array.prototype.slice.call(document.querySelectorAll('.nav-item'));
  const map    = {};
  items.forEach(function (el) { map[el.dataset.nav] = el; });

  /* —— 4 · 吸顶 + 往下滚时收起 ——
     规则：在顶部一定显示；往下滚收起，把屏幕让给内容；往上滚立刻落下来。
     阈值 4px 是为了滤掉触控板的抖动，否则一点点回弹就会闪一下。 */
  const TOP_ZONE = 60;    // 这个范围内一律显示
  const JITTER   = 4;     // 小于它的位移不算方向变化

  let lastY = window.scrollY;
  let ticking = false;
  let lockUntil = 0;      // 程序触发的滚动期间不收起

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      const y = Math.max(window.scrollY, 0);

      navbar.classList.toggle('is-scrolled', y > 80);

      if (y <= TOP_ZONE || performance.now() < lockUntil) {
        navbar.classList.remove('is-hidden');
      } else if (y > lastY + JITTER) {
        navbar.classList.add('is-hidden');
      } else if (y < lastY - JITTER) {
        navbar.classList.remove('is-hidden');
      }

      lastY = y;
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* 点导航跳转时页面会往下滚，那会儿不该把导航自己收起来 */
  function lock(ms) { lockUntil = performance.now() + (ms || 900); }

  /* —— 1+2 · scrollspy ——
     判定基准取视口高度的 45% 处那条水平线：
     用顶部会让板块还没进视野就提前亮起，用正中则切换偏晚。
     作品详情各屏都归属 work，滚过整个作品区期间 work 一直亮着。 */
  let current = 'home';

  function activate(key) {
    if (key === current || !map[key]) return;
    if (map[current]) map[current].classList.remove('is-active');
    map[key].classList.add('is-active');
    current = key;
  }

  const sections = document.querySelectorAll('[data-section]');
  if ('IntersectionObserver' in window && sections.length) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) activate(entry.target.dataset.section);
      });
    }, {
      /* 设计稿标注的是 -45%/-55%，但那样判定区高度正好为 0，
         threshold:0 要求相交面积大于 0，部分浏览器会永不触发。
         留 1% 带宽，判定线位置不变。 */
      rootMargin: '-45% 0px -54% 0px',
      threshold: 0
    });

    sections.forEach(function (s) { io.observe(s); });
  }

  /* —— 4 · 点击平滑滚动，滚动过程中高亮实时跟随 —— */
  items.forEach(function (el) {
    el.addEventListener('click', function (e) {
      const id = el.getAttribute('href');
      const target = id && document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lock();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const wordmark = document.querySelector('.navbar__wordmark');
  if (wordmark) {
    wordmark.addEventListener('click', function (e) {
      e.preventDefault();
      lock();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  window.Navbar = { activate: activate, lock: lock };
})();
