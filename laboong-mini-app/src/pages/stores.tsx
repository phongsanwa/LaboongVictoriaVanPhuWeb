import React from "react";
import { PageHeader } from "../components/page-header";
import { Ico } from "../components/icons";
import { Page } from "zmp-ui";
import { Loading } from "../components/ui";
import { hhmm, imgUrl } from "../lib/format";
import { callPhone, directionsUrl, openLink } from "../lib/zalo";
import { useData } from "../state/data";

/** Giờ Việt Nam hiện tại "HH:MM" để biết quán đang mở hay đóng. */
function vnNow() {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
}

export default function StoresPage() {
  const { home } = useData();
  const now = vnNow();
  return (
    <Page className="page">
      <PageHeader title="Hệ thống cửa hàng" />
      {!home ? <Loading /> : (
        <div className="section stack">
          {home.stores.map((s) => {
            const open = s.opening_time && s.closing_time ? now >= hhmm(s.opening_time) && now < hhmm(s.closing_time) : true;
            return (
              <div key={s.id} className="card">
                {s.photos?.[0] && <img src={imgUrl(s.photos[0]) || ""} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 12, marginBottom: 10 }} />}
                <div className="between"><div className="bold" style={{ fontSize: 16 }}>{s.name}</div><span className={"badge " + (open ? "green" : "gray")}>{open ? "Đang mở cửa" : "Đã đóng cửa"}</span></div>
                <div className="small" style={{ color: "var(--ink-2)", marginTop: 4 }}>{s.address}</div>
                <div className="muted small" style={{ marginTop: 2 }}>Giờ mở cửa: {hhmm(s.opening_time)} – {hhmm(s.closing_time)}</div>
                <div className="row" style={{ marginTop: 12 }}>
                  <button className="btn ghost sm" style={{ flex: 1 }} onClick={() => openLink(directionsUrl(s.latitude, s.longitude, s.address))}><Ico name="pin" size={18} /> Chỉ đường</button>
                  {s.phone && <button className="btn ghost sm" style={{ flex: 1 }} onClick={() => callPhone(s.phone)}><Ico name="phone" size={18} /> Gọi quán</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ height: 24 }} />
    </Page>
  );
}
