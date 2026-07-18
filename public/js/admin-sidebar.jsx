/* global React, Icon, NAV_URLS, adminHref */
const { useState, useEffect } = React;

const SIDEBAR_NAV = [
  { ic: 'chart',   label: 'Tổng quan',          href: '/admin' },
  { ic: 'users',   label: 'Khách hàng',          href: '/admin/customers' },
  { ic: 'receipt', label: 'Điểm & giao dịch',   href: '/admin/points' },
  { ic: 'bag',     label: 'Đơn hàng',            href: '/admin/orders' },
  { ic: 'truck',   label: 'Phí ship',            href: '/admin/shipping' },
  { ic: 'gift',    label: 'Đổi quà',             href: '/admin/rewards' },
  { ic: 'mega',    label: 'Chiến dịch',          href: '/admin/campaigns' },
  { ic: 'star',    label: 'Tin tức',             href: '/admin/news' },
  { ic: 'search',  label: 'SEO',                 href: '/admin/seo' },
  { ic: 'cal',     label: 'Điểm danh',           href: '/admin/checkin' },
  { ic: 'cup',     label: 'Thực đơn',            href: '/admin/menu' },
  { ic: 'percent', label: 'Khuyến mãi',          href: '/admin/promotions' },
  { ic: 'plus',    label: 'Variant / Tuỳ chọn', href: '/admin/variants' },
  { ic: 'pin',     label: 'Cửa hàng',            href: '/admin/stores' },
  { ic: 'shield',  label: 'Phân quyền',          href: '/admin/roles' },
  { ic: 'gear',    label: 'Cài đặt',             href: '/admin/settings' },
];

function AdminSidebar({ activeLabel, badges: pageBadges = {}, admin, sideOpen, onClose }) {
  const [globalBadges, setGlobalBadges] = useState({});
  const [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => {
    fetch('/admin/badges', { headers: { Accept: 'application/json' } })
      .then(r => r.ok ? r.json() : {})
      .then(data => setGlobalBadges(data))
      .catch(() => {});
  }, []);
  const badges = { ...globalBadges, ...pageBadges };
  // _access: null/undefined = admin (thấy tất cả); mảng = staff chỉ thấy mục được cấp quyền
  const access = globalBadges._access;
  const canSee = (n) => !Array.isArray(access) || access.includes(n.label);

  const logout = async (e) => {
    e.preventDefault();
    if (loggingOut) return;
    setLoggingOut(true);
    // Tự gọi /logout (không phụ thuộc apiCall — có trang admin không định nghĩa nó)
    try {
      await fetch('/logout', {
        method: 'POST',
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
          'Accept': 'application/json',
        },
        credentials: 'same-origin',
      });
    } catch (_) { /* vẫn chuyển về trang đăng nhập dù lỗi mạng */ }
    location.href = NAV_URLS.login;
  };

  // 3 mục cuối (Cửa hàng, Phân quyền, Cài đặt) thuộc nhóm "Hệ thống", còn lại là "Quản lý"
  const mgmt = SIDEBAR_NAV.slice(0, SIDEBAR_NAV.length - 3).filter(canSee);
  const sys  = SIDEBAR_NAV.slice(SIDEBAR_NAV.length - 3).filter(canSee);

  const renderLink = (n) => (
    <a key={n.label}
       className={'side-link' + (n.label === activeLabel ? ' on' : '')}
       href={n.href || adminHref(n.label)}>
      <Icon name={n.ic} size={19} /> {n.label}
      {badges[n.label] && <span className="badge">{badges[n.label]}</span>}
    </a>
  );

  return (
    <>
      {sideOpen && <div className="scrim" style={{ zIndex: 55 }} onClick={onClose} />}
      <aside className={'side' + (sideOpen ? ' open' : '')}>
        <div className="side-brand">
          <div className="side-mark"><span>L</span></div>
          <div><div className="nm">Laboong</div><div className="sb">Bảng quản trị</div></div>
        </div>
        <div className="side-body">
          <div className="side-sec">Quản lý</div>
          <nav className="side-nav">{mgmt.map(renderLink)}</nav>
          <div className="side-sec">Hệ thống</div>
          <nav className="side-nav">{sys.map(renderLink)}</nav>
        </div>
        <div className="side-foot">
          <div className="side-user">
            <div className="side-av">{admin?.initials ?? 'QT'}</div>
            <div style={{ minWidth: 0 }}>
              <div className="un">{admin?.name ?? 'Quản trị viên'}</div>
              <div className="ur">{admin?.email ?? ''}</div>
            </div>
            <button className="icon-btn" style={{ width: 32, height: 32, marginLeft: 'auto', opacity: loggingOut ? 0.5 : 1 }}
              onClick={logout} disabled={loggingOut} title="Đăng xuất">
              <Icon name="logout" size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

Object.assign(window, { AdminSidebar });
