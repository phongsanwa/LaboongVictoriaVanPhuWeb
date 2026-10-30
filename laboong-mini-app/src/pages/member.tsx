import React, { useState } from "react";
import { PageHeader } from "../components/page-header";
import { Page, Sheet, useNavigate, useSnackbar } from "zmp-ui";
import { Ico } from "../components/icons";
import { LoginCard, QRImage } from "../components/ui";
import { BRAND, SITE_ORIGIN } from "../config";
import { imgUrl, money, num } from "../lib/format";
import { chatWithShop, followShopOA, shareApp } from "../lib/zalo";
import { useAuth } from "../state/auth";

export default function MemberPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const [qr, setQr] = useState(false);

  const item = (icon: React.ReactNode, label: string, onClick: () => void, sub?: string) => (
    <button className="list-item" onClick={onClick}>
      <span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--brand-soft)", color: "var(--brand)", display: "grid", placeItems: "center", flex: "none" }}>{icon}</span>
      <span style={{ flex: 1 }}><span className="bold" style={{ display: "block", fontSize: 15 }}>{label}</span>{sub && <span className="muted small">{sub}</span>}</span>
      <Ico name="right" color="var(--ink-3)" />
    </button>
  );

  return (
    <Page className="page with-nav">
      <PageHeader title="Thành viên" back={false} />
      {!user ? (
        <div className="section stack">
          <LoginCard onError={(m) => openSnackbar({ text: m, type: "error" })} />
          <div className="card stack small" style={{ color: "var(--ink-2)", lineHeight: 1.5 }}>
            <div className="bold" style={{ color: "var(--ink)", fontSize: 15 }}>Quyền lợi thành viên {BRAND.short}</div>
            <div>• Tích 1 điểm cho mỗi 10.000đ, đổi ly miễn phí và quà tặng</div>
            <div>• Điểm danh mỗi ngày nhận thêm điểm thưởng</div>
            <div>• Dùng chung tài khoản với website — điểm cộng dồn</div>
          </div>
        </div>
      ) : (
        <>
          <div className="section">
            <div style={{ borderRadius: 20, padding: 18, color: "#fff", background: "linear-gradient(140deg,#0F623F,#1AA86A)" }}>
              <div className="row" style={{ gap: 12 }}>
                <div style={{ width: 54, height: 54, borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,.25)", display: "grid", placeItems: "center", fontSize: 22, fontWeight: 800, flex: "none" }}>
                  {user.avatar_url ? <img src={imgUrl(user.avatar_url) || ""} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : user.name.slice(0, 1).toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="bold ellipsis" style={{ fontSize: 18 }}>{user.name}</div>
                  <div style={{ fontSize: 13, opacity: 0.9 }}>{user.phone} · {user.tier?.name || "Thành viên"}</div>
                </div>
                <button onClick={() => setQr(true)} aria-label="Mã thành viên" style={{ width: 44, height: 44, borderRadius: 12, border: 0, background: "#fff", color: "var(--brand)", display: "grid", placeItems: "center" }}><Ico name="qr" /></button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", marginTop: 16, textAlign: "center" }}>
                <div><div style={{ fontSize: 20, fontWeight: 800 }}>{num(user.points)}</div><div style={{ fontSize: 12, opacity: 0.85 }}>Điểm hiện có</div></div>
                <div><div style={{ fontSize: 20, fontWeight: 800 }}>{user.total_orders}</div><div style={{ fontSize: 12, opacity: 0.85 }}>Đơn hoàn tất</div></div>
                <div><div style={{ fontSize: 20, fontWeight: 800 }}>{money(user.total_spent).replace("đ", "")}</div><div style={{ fontSize: 12, opacity: 0.85 }}>Đã chi (đ)</div></div>
              </div>
            </div>
          </div>

          <div className="section list">
            {item(<Ico name="star" size={18} />, "Lịch sử điểm", () => navigate("/points"))}
            {item(<Ico name="gift" size={18} />, "Đổi quà", () => navigate("/rewards"), `Bạn có ${num(user.points)} điểm`)}
            {item(<Ico name="wallet" size={18} />, "Ví quà của tôi", () => navigate("/wallet"))}
            {item(<Ico name="pin" size={18} />, "Địa chỉ giao hàng", () => navigate("/addresses"))}
            {item(<Ico name="user" size={18} />, "Thông tin cá nhân", () => navigate("/profile"))}
          </div>
        </>
      )}

      <div className="section list">
        {item(<Ico name="store" size={18} />, "Hệ thống cửa hàng", () => navigate("/stores"))}
        {item(<Ico name="chat" size={18} />, "Nhắn tin cho quán", () => chatWithShop())}
        {item(<Ico name="heart" size={18} />, "Quan tâm Laboong trên Zalo", async () => openSnackbar({ text: (await followShopOA()) ? "Cảm ơn bạn đã quan tâm!" : "Hãy mở trong Zalo để quan tâm OA", type: "info" }))}
        {item(<Ico name="share" size={18} />, "Chia sẻ cho bạn bè", () => shareApp(SITE_ORIGIN + "/icons/icon-512.png"))}
      </div>

      {user && <div className="section"><button className="btn danger block" onClick={() => logout()}>Đăng xuất</button></div>}
      <div className="muted small" style={{ textAlign: "center", margin: "16px 0 24px" }}>{BRAND.name}</div>

      <Sheet visible={qr} onClose={() => setQr(false)} autoHeight mask handler swipeToClose title="Mã thành viên">
        {user && (
          <div className="sheet-body" style={{ textAlign: "center" }}>
            <div className="muted">Đưa mã này cho thu ngân để tích điểm khi mua tại quầy</div>
            <div style={{ display: "flex", justifyContent: "center", margin: "16px 0" }}><QRImage value={user.referral_code || user.phone} size={220} /></div>
            <div className="bold" style={{ fontSize: 18, letterSpacing: 1 }}>{user.referral_code}</div>
          </div>
        )}
      </Sheet>
    </Page>
  );
}
