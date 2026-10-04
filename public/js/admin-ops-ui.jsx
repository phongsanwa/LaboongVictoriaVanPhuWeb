/* global React */
// Shared look for the operations pages (store settings, ingredients, recipes).

const OPS_C = {
  brand: "#0F623F", brand2: "#3D8B63", gold: "#F2C744", ink: "#1A2420", ink2: "#6B756F", ink3: "#8A9189",
  line: "#EAE6DC", line2: "#F2EFE6", field: "#E5E1D6", bg: "#F7F5F0", tray: "#F1EFE7", danger: "#C0552B",
  warnInk: "#8A5A2E", warnBg: "#FCF3E4", okBg: "#EAF3EE",
};

const opsFmt = n => Math.round(n || 0).toLocaleString("vi-VN") + "đ";

function opsCsrf() {
  return document.querySelector('meta[name="csrf-token"]').content;
}

async function opsApi(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json", "X-CSRF-TOKEN": opsCsrf() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error || data.message || Object.values(data.errors || {}).flat()[0] || "Có lỗi xảy ra, thử lại.";
    throw new Error(msg);
  }
  return data;
}

function OpsHeader({ admin, links = [], center = null }) {
  const pill = { fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.8)", textDecoration: "none", padding: "7px 12px", borderRadius: 9, background: "rgba(255,255,255,0.1)" };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, padding: "18px 24px", background: OPS_C.brand, color: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <a href="/admin/overview" style={{ width: 38, height: 38, borderRadius: 10, background: OPS_C.gold, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: OPS_C.brand, fontSize: 18, textDecoration: "none" }}>L</a>
        <div style={{ fontWeight: 800, fontSize: 19, letterSpacing: "-0.2px" }}>Laboong</div>
        {links.map((l, i) => <a key={l.href} href={l.href} style={{ ...pill, marginLeft: i === 0 ? 14 : 0 }}>{l.label}</a>)}
      </div>
      {center}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ textAlign: "right", lineHeight: 1.2 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{admin?.name}</div>
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.65)" }}>Quản trị viên</div>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#E8845C", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>{admin?.initials}</div>
      </div>
    </div>
  );
}

function useNarrowScreen(px) {
  const [narrow, setNarrow] = React.useState(() => window.innerWidth < px);
  React.useEffect(() => {
    const on = () => setNarrow(window.innerWidth < px);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, [px]);
  return narrow;
}

Object.assign(window, { OPS_C, opsFmt, opsApi, OpsHeader, useNarrowScreen });
