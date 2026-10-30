import React from "react";
import { Page, useLocation, useNavigate } from "zmp-ui";
import { money, vietQrUrl } from "../lib/format";

export default function OrderDonePage() {
  const { state } = useLocation() as { state: any };
  const navigate = useNavigate();
  if (!state) { navigate("/", { replace: true }); return null; }
  const bank = state.payment_method === "bank" && state.bank?.bankEnabled ? state.bank : null;

  return (
    <Page className="page" style={{ padding: "calc(40px + env(safe-area-inset-top)) 16px 24px" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 76, height: 76, borderRadius: "50%", background: "var(--brand)", color: "#fff", display: "grid", placeItems: "center", fontSize: 40, margin: "0 auto" }}>✓</div>
        <h2 style={{ margin: "16px 0 4px" }}>Đặt hàng thành công!</h2>
        <div className="muted">Mã đơn <b style={{ color: "var(--ink)" }}>{state.order_code}</b> · {money(state.total_amount)}</div>
        {state.points_earned > 0 && <div className="badge gold" style={{ marginTop: 10 }}>+{state.points_earned} điểm khi đơn hoàn tất</div>}
      </div>

      {bank && (
        <div className="card" style={{ marginTop: 20, textAlign: "center" }}>
          <div className="bold">Quét mã để chuyển khoản</div>
          <div className="muted small" style={{ marginTop: 4 }}>Nội dung chuyển khoản: <b>{state.order_code}</b></div>
          <img src={vietQrUrl(bank, state.total_amount, state.order_code)} alt="VietQR" style={{ width: "100%", maxWidth: 300, margin: "12px auto 0" }} />
          <div className="muted small" style={{ marginTop: 8 }}>{bank.accountName} · {bank.accountNumber}</div>
          <div className="muted small">Nhấn giữ ảnh để lưu, rồi mở app ngân hàng để quét.</div>
        </div>
      )}

      <div className="stack" style={{ marginTop: 24 }}>
        <button className="btn block" onClick={() => navigate("/orders", { replace: true })}>Theo dõi đơn hàng</button>
        <button className="btn ghost block" onClick={() => navigate("/", { replace: true })}>Về trang chủ</button>
      </div>
    </Page>
  );
}
