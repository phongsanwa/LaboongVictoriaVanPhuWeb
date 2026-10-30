import React, { useEffect, useState } from "react";
import { PageHeader } from "../components/page-header";
import { Page, Sheet, useNavigate } from "zmp-ui";
import { Ico } from "../components/icons";
import { Empty, ErrorBox, Loading, LoginCard, QRImage } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../state/auth";

interface WalletItem { id: number; name: string; cat: string; code: string; fine: string; created: string | null; expiry: string | null; status: "active" | "used" | "expired" }
const TABS: [WalletItem["status"], string][] = [["active", "Còn dùng được"], ["used", "Đã dùng"], ["expired", "Hết hạn"]];
const vnDate = (d: string | null) => (d ? d.split("-").reverse().join("/") : "");

export default function WalletPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<WalletItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<WalletItem["status"]>("active");
  const [open, setOpen] = useState<WalletItem | null>(null);

  const load = () => api<{ vouchers: WalletItem[] }>("/rewards/wallet").then((d) => { setItems(d.vouchers); setError(null); }).catch((e) => setError(e.message));
  useEffect(() => { if (user) load(); }, [user]); // eslint-disable-line

  const list = (items || []).filter((v) => v.status === tab);

  return (
    <Page className="page">
      <PageHeader title="Ví quà của tôi" />
      {!user ? <div className="section"><LoginCard /></div> : error ? <ErrorBox text={error} onRetry={load} /> : !items ? <Loading /> : (
        <>
          <div className="chips" style={{ marginTop: 12 }}>
            {TABS.map(([k, l]) => <button key={k} className={"chip" + (tab === k ? " on" : "")} onClick={() => setTab(k)}>{l} ({items.filter((v) => v.status === k).length})</button>)}
          </div>
          {list.length === 0 ? (
            <Empty icon="🎟️" title={tab === "active" ? "Chưa có quà nào" : "Không có quà"} sub={tab === "active" ? "Dùng điểm để đổi quà nhé!" : undefined}
              action={tab === "active" ? <button className="btn" onClick={() => navigate("/rewards")}>Đổi quà</button> : undefined} />
          ) : (
            <div className="section stack">
              {list.map((v) => (
                <button key={v.id} className="card row" style={{ textAlign: "left", gap: 12, opacity: v.status === "active" ? 1 : 0.6 }} onClick={() => setOpen(v)}>
                  <span style={{ width: 48, height: 48, borderRadius: 14, background: "#FFF6DB", color: "#B07A00", display: "grid", placeItems: "center", flex: "none" }}><Ico name="gift" /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="bold">{v.name}</div>
                    <div className="muted small">Mã: {v.code}</div>
                    {v.expiry && <div className="muted small">HSD: {vnDate(v.expiry)}</div>}
                  </div>
                  {v.status === "active" && <Ico name="qr" size={22} color="var(--brand)" />}
                </button>
              ))}
            </div>
          )}
          <div style={{ height: 24 }} />
        </>
      )}

      <Sheet visible={!!open} onClose={() => setOpen(null)} autoHeight mask handler swipeToClose title={open?.name}>
        {open && (
          <div className="sheet-body" style={{ textAlign: "center" }}>
            {open.status === "active" ? (
              <>
                <div className="muted">Đưa mã cho thu ngân quét khi dùng tại quầy. Voucher giảm giá cũng chọn được ở bước đặt hàng online.</div>
                <div style={{ display: "flex", justifyContent: "center", margin: "16px 0" }}><QRImage value={open.code} size={210} /></div>
              </>
            ) : <div className="badge gray" style={{ margin: "10px 0" }}>{open.status === "used" ? "Đã sử dụng" : "Đã hết hạn"}</div>}
            <div className="bold" style={{ fontSize: 17, letterSpacing: 1 }}>{open.code}</div>
            {open.fine && <div className="muted small" style={{ marginTop: 8 }}>{open.fine}</div>}
            {open.expiry && <div className="muted small" style={{ marginTop: 4 }}>Hạn dùng: {vnDate(open.expiry)}</div>}
          </div>
        )}
      </Sheet>
    </Page>
  );
}
