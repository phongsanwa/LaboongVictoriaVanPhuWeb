import React, { useEffect, useState } from "react";
import { PageHeader } from "../components/page-header";
import { Page } from "zmp-ui";
import { Empty, ErrorBox, Loading, LoginCard } from "../components/ui";
import { api } from "../lib/api";
import { num } from "../lib/format";
import { useAuth } from "../state/auth";

interface PointsData {
  balance: number; earnedTotal: number; redeemedTotal: number; expiring: number; expireDate: string | null;
  months: { key: string; label: string }[];
  history: Record<string, { type: string; title: string; store: string; day: string; time: string; amt: number }[]>;
}

export default function PointsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<PointsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);

  const load = () => api<PointsData>("/points").then((d) => { setData(d); setMonth(d.months[0]?.key ?? null); setError(null); }).catch((e) => setError(e.message));
  useEffect(() => { if (user) load(); }, [user]); // eslint-disable-line

  const rows = data && month ? data.history[month] || [] : [];

  return (
    <Page className="page">
      <PageHeader title="Lịch sử điểm" />
      {!user ? <div className="section"><LoginCard /></div> : error ? <ErrorBox text={error} onRetry={load} /> : !data ? <Loading /> : (
        <>
          <div className="section card">
            <div className="muted small">Điểm hiện có</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: "var(--brand)" }}>{num(data.balance)}</div>
            <div className="between small" style={{ marginTop: 8 }}>
              <span>Đã tích: <b>{num(data.earnedTotal)}</b></span><span>Đã đổi: <b>{num(data.redeemedTotal)}</b></span>
            </div>
            {data.expiring > 0 && <div className="badge red" style={{ marginTop: 10 }}>{num(data.expiring)} điểm hết hạn ngày {data.expireDate}</div>}
            <div className="muted small" style={{ marginTop: 10 }}>Mỗi 10.000đ = 1 điểm. Điểm đơn online được cộng khi đơn hoàn tất.</div>
          </div>
          {data.months.length === 0 ? <Empty icon="⭐" title="Chưa có giao dịch điểm" /> : (
            <>
              <div className="chips" style={{ marginTop: 16 }}>
                {data.months.map((m) => <button key={m.key} className={"chip" + (m.key === month ? " on" : "")} onClick={() => setMonth(m.key)}>{m.label}</button>)}
              </div>
              <div className="section list">
                {rows.map((r, i) => (
                  <div key={i} className="list-item" style={{ alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="bold small">{r.title}</div>
                      <div className="muted small">{r.day} · {r.time}{r.store ? ` · ${r.store}` : ""}</div>
                    </div>
                    <div className="bold" style={{ color: r.amt >= 0 ? "var(--brand)" : "var(--flash)" }}>{r.amt >= 0 ? "+" : ""}{num(r.amt)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
          <div style={{ height: 24 }} />
        </>
      )}
    </Page>
  );
}
