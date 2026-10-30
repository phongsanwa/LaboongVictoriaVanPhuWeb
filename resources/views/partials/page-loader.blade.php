{{-- Màn hình chờ dùng chung: vòng xoay hiện ngay khi trang đang tải (thay cho màn trắng lúc
     giao diện React chưa dựng xong) và khi bấm chuyển sang trang khác. Ảnh gốc: public/images/loading.png --}}
<style>
  :root { --lb-spinner: url("data:image/png;base64,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"); }
  @keyframes lb-spin { to { transform: rotate(360deg); } }
  /* #root còn trống = React chưa vẽ xong → hiện vòng xoay giữa màn hình; React vẽ xong là tự mất. */
  #root:empty { min-height: 100vh; }
  #root:empty::before, .lb-nav-loader::before {
    content: ""; position: fixed; left: 50%; top: 50%; width: 48px; height: 48px; margin: -24px 0 0 -24px; z-index: 2;
    background: var(--lb-spinner) center / contain no-repeat;
    animation: lb-spin .9s steps(8) infinite;
  }
  .lb-nav-loader { position: fixed; inset: 0; z-index: 2147483000; background: rgba(255, 255, 255, .45); opacity: 0; pointer-events: none; transition: opacity .15s ease .12s; }
  .lb-nav-loader.on { opacity: 1; pointer-events: auto; }
  .lb-nav-loader::after { content: ""; position: fixed; left: 50%; top: 50%; width: 80px; height: 80px; margin: -40px 0 0 -40px; z-index: 1; background: #fff; border-radius: 22px; box-shadow: 0 10px 30px rgba(0, 0, 0, .12); }
  /* Vòng xoay nhỏ dùng trong trang khi đang chờ dữ liệu: <span className="lb-spin" /> (thêm "lg" cho cỡ lớn). */
  .lb-spin { display: inline-block; flex: none; width: 18px; height: 18px; vertical-align: -4px; background: var(--lb-spinner) center / contain no-repeat; animation: lb-spin .9s steps(8) infinite; }
  .lb-spin.lg { width: 36px; height: 36px; }
</style>
<script>
  (function () {
    var el, timer, skipNext = false;
    function show() {
      if (skipNext) { skipNext = false; return; }
      if (!el && document.body) { el = document.createElement('div'); el.className = 'lb-nav-loader'; el.setAttribute('aria-hidden', 'true'); document.body.appendChild(el); }
      if (!el) return;
      el.classList.add('on');
      clearTimeout(timer);
      timer = setTimeout(hide, 8000); // phòng khi trang không chuyển (tải file, bị chặn…)
    }
    function hide() { clearTimeout(timer); if (el) el.classList.remove('on'); }
    // Link tải file / gọi điện / mail… không rời trang → không hiện vòng xoay.
    function staysOnPage(a) {
      return !/^https?:$/.test(a.protocol) || a.hasAttribute('download')
        || /\/(export|download)\b|\.(csv|xlsx?|pdf|zip)(\?|$)/i.test(a.pathname + a.search);
    }
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || (a.target && a.target !== '_self')) return;
      if (staysOnPage(a)) { skipNext = true; setTimeout(function () { skipNext = false; }, 1500); return; }
      if (a.origin === location.origin && a.pathname === location.pathname && a.search === location.search) return; // chỉ đổi #…
      show();
    });
    // Chuyển trang bằng code (location.href = …, đăng xuất, tải lại…).
    window.addEventListener('beforeunload', show);
    // Quay lại bằng nút Back (trang lấy từ bộ nhớ đệm) → tắt vòng xoay.
    window.addEventListener('pageshow', hide);
    window.LBLoader = { show: show, hide: hide };
  })();
</script>
