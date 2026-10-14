import React, { useEffect, useState } from "react";
import { PageHeader } from "../components/page-header";
import { Ico } from "../components/icons";
import { Page, Sheet, useSnackbar } from "zmp-ui";
import { Empty, ErrorBox, Loading, LoginCard } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../state/auth";
import { useData } from "../state/data";
import type { Address } from "../types";

const LABELS = ["Nhà", "Công ty", "Khác"];

export default function AddressesPage() {
  const { user } = useAuth();
  const { reloadMenu } = useData();
  const { openSnackbar } = useSnackbar();
  const [list, setList] = useState<Address[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ label: "Nhà", text: "", lat: null as number | null, lng: null as number | null, def: false });
  const [suggest, setSuggest] = useState<{ text: string; lat: number; lng: number }[]>([]);
  const [busy, setBusy] = useState(false);

  const load = () => api<{ addresses: Address[] }>("/addresses").then((d) => { setList(d.addresses); setError(null); }).catch((e) => setError(e.message));
  useEffect(() => { if (user) load(); }, [user]); // eslint-disable-line

  // Gợi ý địa chỉ (nhà cung cấp bản đồ đã chọn trong Admin) để lấy sẵn toạ độ tính phí ship.
  useEffect(() => {
    if (!adding || f.text.trim().length < 4 || f.lat) { setSuggest([]); return; }
    const t = setTimeout(() => {
      api<{ ok: boolean; results: { text: string; lat: number; lng: number }[] }>(`/geo/autocomplete?q=${encodeURIComponent(f.text.trim())}`)
        .then((r) => setSuggest(r.ok ? r.results.slice(0, 5) : []))
        .catch(() => setSuggest([]));
    }, 450);
    return () => clearTimeout(t);
  }, [f.text, f.lat, adding]);

  const save = async () => {
    setBusy(true);
    try {
      await api("/addresses", { body: { label: f.label, address_text: f.text.trim(), lat: f.lat, lng: f.lng, def: f.def } });
      openSnackbar({ text: "Đã thêm địa chỉ", type: "success" });
      setAdding(false);
      setF({ label: "Nhà", text: "", lat: null, lng: null, def: false });
      load(); reloadMenu();
    } catch (e: any) {
      openSnackbar({ text: e.message, type: "error" });
    } finally { setBusy(false); }
  };

  const remove = async (a: Address) => {
    try {
      await api(`/addresses/${a.id}`, { method: "DELETE" });
      load(); reloadMenu();
    } catch (e: any) { openSnackbar({ text: e.message, type: "error" }); }
  };

  return (
    <Page className="page">
      <PageHeader title="Địa chỉ giao hàng" />
      {!user ? <div className="section"><LoginCard /></div> : error ? <ErrorBox text={error} onRetry={load} /> : !list ? <Loading /> : (
        <>
          {list.length === 0 ? <Empty icon="📍" title="Chưa có địa chỉ" sub="Thêm địa chỉ để đặt giao tận nơi." /> : (
            <div className="section list">
              {list.map((a) => (
                <div key={a.id} className="list-item" style={{ alignItems: "flex-start" }}>
                  <Ico name="pin" color="var(--brand)" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="bold small">{a.label} {a.def && <span className="badge green">Mặc định</span>}</div>
                    <div className="small" style={{ color: "var(--ink-2)", marginTop: 2 }}>{a.text}</div>
                  </div>
                  <button className="link" style={{ color: "var(--danger)" }} onClick={() => remove(a)}>Xoá</button>
                </div>
              ))}
            </div>
          )}
          <div className="section"><button className="btn block" onClick={() => setAdding(true)}>+ Thêm địa chỉ mới</button></div>
        </>
      )}

      <Sheet visible={adding} onClose={() => setAdding(false)} autoHeight mask handler swipeToClose title="Thêm địa chỉ">
        <div className="sheet-body stack">
          <div className="opt-pills">
            {LABELS.map((l) => <button key={l} className={"opt-pill" + (f.label === l ? " on" : "")} onClick={() => setF({ ...f, label: l })}>{l}</button>)}
          </div>
          <div className="field">
            <label>Địa chỉ (số nhà, đường, phường, quận)</label>
            <textarea className="input" rows={2} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value, lat: null, lng: null })} placeholder="VD: S2.03 KĐT Văn Phú, Hà Đông, Hà Nội" />
          </div>
          {suggest.length > 0 && (
            <div className="list">
              {suggest.map((s, i) => (
                <button key={i} className="list-item small" onClick={() => { setF({ ...f, text: s.text, lat: s.lat, lng: s.lng }); setSuggest([]); }}>
                  <Ico name="pin" size={18} color="var(--ink-3)" /> {s.text}
                </button>
              ))}
            </div>
          )}
          <label className="row small" style={{ gap: 8 }}><input type="checkbox" checked={f.def} onChange={(e) => setF({ ...f, def: e.target.checked })} style={{ width: 18, height: 18 }} /> Đặt làm địa chỉ mặc định</label>
          <button className="btn block" disabled={busy || f.text.trim().length < 6} onClick={save}>{busy ? "Đang lưu…" : "Lưu địa chỉ"}</button>
        </div>
      </Sheet>
    </Page>
  );
}
