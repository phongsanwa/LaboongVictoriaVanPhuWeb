/* global React, Icon, NAV_URLS, adminHref, apiCall */
const { useState, useEffect } = React;

const SIDEBAR_NAV = [
  { ic: 'chart',   label: 'Tổng quan',          href: '/admin' },
  { ic: 'users',   label: 'Khách hàng',          href: '/admin/customers' },
  { ic: 'receipt', label: 'Điểm & giao dịch',   href: '/admin/points' },
  { ic: 'bag',     label: 'Đơn hàng',            href: '/admin/orders' },
  { ic: 'truck',   label: 'Phí ship',            href: '/admin/shipping' },
  { ic: 'gift',    label: 'Đổi quà',             href: '/admin/rewards' },
  { ic: 'mega',    label: 'Chiến dịch',          href: '/admin/campaigns' },
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
    await apiCall('POST', '/logout');
    location.href = NAV_URLS.login;
  };

  const mgmt = SIDEBAR_NAV.slice(0, 11).filter(canSee);
  const sys  = SIDEBAR_NAV.slice(11).filter(canSee);

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
            <button className="icon-btn" style={{ width: 32, height: 32, marginLeft: 'auto' }}
              onClick={logout} title="Đăng xuất">
              <Icon name="logout" size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

Object.assign(window, { AdminSidebar });
