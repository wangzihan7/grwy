/* ============================================================
   video-player.js — 规格 1 · 点了才播，播完停住
   ------------------------------------------------------------
   播放器不自动播放：常态是封面加中间的播放按钮，安静待着。
   点一下才放，放完不循环、不接着下一个，画面回到封面、按钮重新出现。
   视频是那一页的主角，但什么时候看由人决定。

   <video> 上不加 autoplay / loop / muted，
   playsinline 必须带，否则 iOS 会强制全屏。
   ============================================================ */

(function () {
  'use strict';

  const ICON_PLAY  = 'M0 0l23 13.5L0 27z';
  const ICON_PAUSE = 'M0 0h7v27H0zM14 0h7v27h-7z';

  Array.prototype.forEach.call(document.querySelectorAll('[data-video]'), function (wrap) {
    const video = wrap.querySelector('video');
    const btn   = wrap.querySelector('.vox-player__btn');
    const icon  = btn && btn.querySelector('path');
    const fsBtn = wrap.querySelector('.vox-player__fs');
    if (!video) return;

    function setIcon(playing) {
      if (icon) icon.setAttribute('d', playing ? ICON_PAUSE : ICON_PLAY);
      if (btn) btn.setAttribute('aria-label', playing ? '暂停' : '播放');
    }

    function toggle() {
      if (video.paused) {
        video.play().catch(function () { /* 用户手势之外被拒，忽略 */ });
      } else {
        video.pause();
      }
    }

    wrap.addEventListener('click', toggle);
    wrap.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });

    /* —— 全屏观看 ——
       播放器只有 820px 宽，后台演示里的表格字看不清。
       全屏的是整个容器而不是 video 本身：容器全屏能保留圆角之外的
       自定义结构，同时把原生控件打开，进度、音量、退出都有了。
       iOS Safari 不支持元素全屏，退回 video 自己的全屏方法。 */
    function goFullscreen() {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        return;
      }
      const req = wrap.requestFullscreen || wrap.webkitRequestFullscreen;
      if (req) {
        req.call(wrap);
      } else if (video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();   // iOS
      }
    }

    if (fsBtn) {
      fsBtn.addEventListener('click', function (e) {
        e.stopPropagation();   // 别连带触发容器的播放/暂停
        goFullscreen();
      });
    }

    /* 全屏时交给浏览器原生控件，退出后收回自绘的那套 */
    function syncFullscreen() {
      const fs = (document.fullscreenElement === wrap) ||
                 (document.webkitFullscreenElement === wrap);
      video.controls = fs;
      if (fs && video.paused) video.play().catch(function () {});
    }
    document.addEventListener('fullscreenchange', syncFullscreen);
    document.addEventListener('webkitfullscreenchange', syncFullscreen);

    video.addEventListener('play', function () {
      wrap.classList.add('is-playing');
      setIcon(true);
    });
    video.addEventListener('pause', function () {
      setIcon(false);
      /* 暂停不等于结束：按钮回到播放态，但仍算「播放中」，
         这样进度条和当前画面都留着 */
    });

    /* 放完回到封面：currentTime 归零 + load() 让 poster 重新显示 */
    video.addEventListener('ended', function () {
      wrap.classList.remove('is-playing');
      setIcon(false);
      video.currentTime = 0;
      video.load();
    });

    setIcon(false);
  });
})();
