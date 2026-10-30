import React, { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/page-header";
import { Modal, Page, useNavigate, useSnackbar } from "zmp-ui";
import { Empty, ErrorBox, Loading, LoginCard, Thumb } from "../components/ui";
import { api } from "../lib/api";
import { num } from "../lib/format";
import { useAuth } from "../state/auth";

interface Gift { id: number; name: string; cat: string; points: number; stock: number | null; img: string | null; grad: string | null; tags: string[]; perLimit: number | null; limitReached: boolean }
const CATS: [string, string][] = [["all", "Tất cả"], ["drink", "Đồ uống"], ["voucher", "Voucher"], ["topping", "Topping"], ["upsize", "Upsize"], ["gift", "Quà tặng"]];

export default function RewardsPage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const [data, setData] = useState<{ balance: number; gifts: Gift[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cat, setCat] = useState("all");
  const [confirm, setConfirm] = useState<Gift | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => api("/rewards").then((d) => { setData(d); setError(null); }).catch((e) => setError(e.message));
  useEffect(() => { if (user) load(); }, [user]); // eslint-disable-line

  const gifts = useMemo(() => (data?.gifts || []).filter((g) => cat === "all" || g.cat === cat || (cat === "upsize" && g.cat === "upgrade")), [data, cat]);

  const redeem = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      const r = await api<{ message: string; balance: number }>("/rewards/redeem", { body: { reward_id: confirm.id } });
      openSnackbar({ text: r.message, type: "success" });
      setConfirm(null);
      load(); refresh();
    } catch (e: any) {
      openSnackbar({ text: e.message, type: "error" });
    } finally { setBusy(false); }
  };

  return (
    <Page className="page">
      <PageHeader title="Đổi quà" />
      {!user ? <div className="section"><LoginCard title="Đăng nhập để đổi quà" /></div> : error ? <ErrorBox text={error} onRetry={load} /> : !data ? <Loading /> : (
        <>
          <div className="section card between">
            <div><div className="muted small">Điểm của bạn</div><div style={{ fontSize: 26, fontWeight: 800, color: "var(--brand)" }}>{num(data.balance)}</div></div>
            <button className="btn ghost sm" onClick={() => navigate("/wallet")}>Ví quà của tôi</button>
          </div>
          <div className="chips" style={{ marginTop: 14 }}>
            {CATS.map(([k, l]) => <button key={k} className={"chip" + (cat === k ? " on" : "")} onClick={() => setCat(k)}>{l}</button>)}
          </div>
          {gifts.length === 0 ? <Empty icon="🎁" title="Chưa có quà trong mục này" /> : (
            <div className="section" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {gifts.map((g) => {
                const enough = data.balance >= g.points;
                const out = g.stock !== null && g.stock !== -1 && g.stock <= 0;
                const disabled = !enough || out || g.limitReached;
                return (
                  <div key={g.id} className="card" style={{ padding: 10, display: "flex", flexDirection: "column" }}>
                    <div style={{ position: "relative" }}>
                      <Thumb img={g.img} grad={g.grad || "linear-gradient(150deg,#F2C744,#F59E0B)"} size={150} />
                      {g.tags.includes("hot") && <span className="badge red" style={{ position: "absolute", top: 6, left: 6 }}>HOT</span>}
                    </div>
                    <div className="bold small clamp2" style={{ marginTop: 8, minHeight: 36 }}>{g.name}</div>
                    <div className="bold" style={{ color: "#B07A00", marginTop: 4 }}>★ {num(g.points)} điểm</div>
                    <button className="btn sm block" style={{ marginTop: 8 }} disabled={disabled} onClick={() => setConfirm(g)}>
                      {out ? "Hết quà" : g.limitReached ? "Đã đạt giới hạn" : enough ? "Đổi ngay" : `Thiếu ${num(g.points - data.balance)}`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ height: 24 }} />
        </>
      )}

      <Modal visible={!!confirm} title="Xác nhận đổi quà" onClose={() => setConfirm(null)}
        description={confirm ? `Dùng ${num(confirm.points)} điểm để đổi "${confirm.name}"? Quà sẽ nằm trong Ví quà của bạn.` : ""}
        actions={[
          { text: "Huỷ", close: true },
          { text: busy ? "Đang đổi…" : "Đổi quà", highLight: true, disabled: busy, onClick: redeem },
        ]} />
    </Page>
  );
}
