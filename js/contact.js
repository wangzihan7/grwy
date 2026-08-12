/* ============================================================
   contact.js — 规格 41 点一下就复制走了 / 42 手机号点开才显示
                43 简历按钮 hover 抖一下 / 47 进场只播一次
   ============================================================ */

(function () {
  'use strict';

  const contact = document.getElementById('contact');
  if (!contact) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* —— 47 · 进场只播一次 —— */
  if (new URLSearchParams(location.search).has('dev') || !('IntersectionObserver' in window)) {
    contact.classList.add('is-in');
  } else {
    const io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      contact.classList.add('is-in');
      io.disconnect();
    }, { rootMargin: '0px 0px -15% 0px', threshold: 0 });
    io.observe(contact);
  }

  /* —— 41 · 邮箱点一下就复制走了 —— */
  const mail = contact.querySelector('[data-copy]');
  if (mail) {
    const act = mail.querySelector('.ct-card__act');
    const text = mail.dataset.copy;
    let back = 0;

    mail.addEventListener('click', function () {
      function done(ok) {
        clearTimeout(back);
        act.textContent = ok ? '已复制 ✓' : '复制失败，请手动选中';
        mail.classList.toggle('is-copied', ok);
        back = setTimeout(function () {
          act.textContent = '点击复制';
          mail.classList.remove('is-copied');
        }, 1500);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); },
                                                 function () { done(false); });
      } else {
        /* 老浏览器或非安全上下文（http 页面）拿不到 clipboard API */
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.cssText = 'position:fixed;opacity:0';
          document.body.appendChild(ta);
          ta.select();
          done(document.execCommand('copy'));
          ta.remove();
        } catch (e) { done(false); }
      }
    });
  }

  /* —— 42 · 手机号点开才显示 ——
     真实号码不写进 HTML，点击时才由 JS 拼出来，
     爬虫抓页面源码抓不到完整号码，真人想看随时能看。

     ↓↓↓ 把中间四位换成你的真实号码 ↓↓↓ */
  const PHONE_MID = '8067';
  /* ↑↑↑ 只改这四位就行，前后两段在 HTML 里 ↑↑↑ */

  const phone = contact.querySelector('[data-phone]');
  if (phone) {
    const val = phone.querySelector('.ct-card__v');
    const act = phone.querySelector('.ct-card__act');
    let shown = false;

    phone.addEventListener('click', function () {
      if (shown) return;
      shown = true;
      act.textContent = '已显示';

      const head = phone.dataset.head || '';
      const tail = phone.dataset.tail || '';
      val.innerHTML = head + ' ' +
        PHONE_MID.split('').map(function (d) {
          return '<span class="ct-digit">' + d + '</span>';
        }).join('') + ' ' + tail;

      if (reduce) return;
      /* 逐位翻出来，像老式翻页牌 */
      Array.prototype.forEach.call(val.querySelectorAll('.ct-digit'), function (el, i) {
        setTimeout(function () { el.classList.add('is-flip'); }, i * 60);
      });
    });
  }

  /* —— 43 · 简历按钮移开时抖一下 —— */
  /* 简历暂未开放时不拖动 —— 会让人以为能点 */
  const btn = contact.querySelector('.ct-btn:not(.ct-btn--soon)');
  if (btn && !reduce) {
    btn.addEventListener('mouseleave', function () {
      btn.classList.add('is-wiggle');
      setTimeout(function () { btn.classList.remove('is-wiggle'); }, 420);
    });
  }
})();
