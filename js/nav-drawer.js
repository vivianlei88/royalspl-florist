// 全站導航抽屜：半屏抽屜 + 遮罩聯動
// 與各頁內聯的 menuBtn / navCloseBtn 綁定並存，classList 操作冪等，不衝突。
(function () {
  function initNavDrawer() {
    var drawer = document.getElementById('navDrawer');
    if (!drawer) return;

    var overlay = document.getElementById('navOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'navOverlay';
      overlay.className = 'nav-overlay';
      document.body.appendChild(overlay);
    }

    function openDrawer() {
      drawer.classList.add('open');
      overlay.classList.add('open');
    }

    function closeDrawer() {
      drawer.classList.remove('open');
      overlay.classList.remove('open');
    }

    var menuBtn = document.getElementById('menuBtn');
    if (menuBtn) menuBtn.addEventListener('click', openDrawer);

    var closeBtn = document.getElementById('navCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

    overlay.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavDrawer);
  } else {
    initNavDrawer();
  }
})();
