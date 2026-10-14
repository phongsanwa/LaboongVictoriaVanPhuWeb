import React, { useEffect, useState } from "react";
import { Page, Sheet, Swiper, useNavigate, useSnackbar } from "zmp-ui";
import { Ico } from "../components/icons";
import { ErrorBox, Loading, LoginCard, Price, QRImage, Thumb } from "../components/ui";
import { BRAND } from "../config";
import { api } from "../lib/api";
import { imgUrl, money, num } from "../lib/format";
import { chatWithShop, followShopOA } from "../lib/zalo";
import { useAuth } from "../state/auth";
import { useData } from "../state/data";
import type { FlashSale, HomeData } from "../types";

function useCountdown(target: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!target) return "";
  const s = Math.max(0, Math.floor((new Date(target).getTime() - now) / 1000));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function FlashStrip({ sale, onOpen }: { sale: FlashSale; onOpen: (id: string) => void }) {
  const live = sale.status === "live";
  const left = useCountdown(live ? sale.end : sale.start);
  return (
    <div className="section">
      <div className="card" style={{ padding: 0, overflow: "hidden", borderColor: "#F8D3CC" }}>
        <div className="between" style={{ padding: "12px 14px", background: "linear-gradient(90deg,#E4402F,#FF7A3D)", color: "#fff" }}>
          <div className="row" style={{ gap: 6 }}><Ico name="flame" size={20} color="#fff" /><b style={{ fontSize: 16 }}>{sale.name}</b></div>
          <div style={{ fontSize: 12.5, fontWeight: 700 }}>{live ? "Kết thúc sau" : "Sắp diễn ra ·"} <span style={{ background: "rgba(0,0,0,.2)", padding: "2px 6px", borderRadius: 6, fontVariantNumeric: "tabular-nums" }}>{left}</span></div>
        </div>
        <div className="hscroll" style={{ padding: 12 }}>
          {sale.items.map((it) => {
            const pct = it.quota ? Math.min(100, Math.round((it.sold / it.quota) * 100)) : 0;
            return (
              <button key={it.id} onClick={() => onOpen(it.id)} style={{ flex: "none", width: 124, border: 0, background: "none", padding: 0, textAlign: "left" }}>
                <Thumb img={it.img} grad={it.grad} size={124} />
                <div className="bold clamp2" style={{ fontSize: 13.5, marginTop: 6, minHeight: 36 }}>{it.name}</div>
                <Price price={it.price} sale={it.flash_price} flash />
                {live && it.quota ? (
                  <div style={{ marginTop: 6, height: 16, borderRadius: 8, background: "#FDE3DE", position: "relative", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "#E4402F" }} />
                    <span style={{ position: "absolute", inset: 0, fontSize: 10.5, fontWeight: 800, color: pct > 55 ? "#fff" : "#B3261E", textAlign: "center", lineHeight: "16px" }}>
                      {it.sold >= it.quota ? "Hết suất" : `Đã bán ${it.sold}/${it.quota}`}
                    </span>
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CheckinCard({ home, onDone }: { home: HomeData; onDone: () => void }) {
  const { openSnackbar } = useSnackbar();
  const [busy, setBusy] = useState(false);
  const days = home.checkinConfig || [];
  const streak = home.checkin.streak;
  const doneToday = home.checkin.today;
  // Chuỗi đứt (lần cuối không phải hôm qua/hôm nay) thì bắt đầu lại ngày 1.
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const active = doneToday || home.checkin.last === yesterday ? streak : 0;
  const filled = doneToday ? ((active - 1) % 7) + 1 : active % 7;
  const todayIdx = doneToday ? filled - 1 : filled;

  const checkin = async () => {
    setBusy(true);
    try {
      const r = await api<{ points_awarded: number; streak: number }>("/checkin", { method: "POST" });
      openSnackbar({ text: `Điểm danh thành công +${num(r.points_awarded)} điểm`, type: "success" });
      onDone();
    } catch (e: any) {
      openSnackbar({ text: e.message, type: "error" });
    } finally { setBusy(false); }
  };

  return (
    <div className="section">
      <div className="card">
        <div className="between">
          <div><div className="bold">Điểm danh mỗi ngày</div><div className="muted">Chuỗi hiện tại: {active} ngày</div></div>
          <button className="btn sm" disabled={busy || doneToday} onClick={checkin}>{doneToday ? "Đã điểm danh" : `Nhận +${num(days[todayIdx]?.pts ?? 0)}`}</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${days.length || 7}, 1fr)`, gap: 6, marginTop: 12 }}>
          {days.map((d, i) => {
            const got = i < filled;
            return (
              <div key={i} style={{ textAlign: "center", padding: "8px 0", borderRadius: 10, background: got ? "var(--brand)" : d.bonus ? "#FFF6DB" : "#F4F2EC", color: got ? "#fff" : "var(--ink-2)", border: i === todayIdx && !doneToday ? "1.5px dashed var(--brand)" : "1.5px solid transparent" }}>
                <div style={{ fontSize: 13, fontWeight: 800 }}>+{num(d.pts)}</div>
                <div style={{ fontSize: 10.5, marginTop: 2 }}>{got ? "✓" : `N${i + 1}`}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { home, menu, error, reloadHome } = useData();
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const [qrOpen, setQrOpen] = useState(false);
  const [news, setNews] = useState<HomeData["news"][number] | null>(null);

  if (!home) return <Page className="page">{error ? <ErrorBox text={error} onRetry={reloadHome} /> : <Loading />}</Page>;

  const openProduct = (id: string) => navigate(`/menu?p=${id}`);
  const best = (menu?.menu || []).filter((p) => p.available && p.tags.includes("hot")).slice(0, 8);
  const goalPct = home.goal ? Math.min(100, Math.round((home.points / home.goal) * 100)) : 0;
  const err = (msg: string) => openSnackbar({ text: msg, type: "error" });

  return (
    <Page className="page with-nav" restoreScrollOnBack>
      <div className="hero">
        <div className="between">
          <div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>{user ? `Xin chào,` : "Chào mừng đến"}</div>
            <h1>{user ? user.name : BRAND.name}</h1>
          </div>
          <button onClick={() => chatWithShop()} aria-label="Nhắn tin cho quán" style={{ width: 40, height: 40, borderRadius: 12, border: 0, background: "rgba(255,255,255,.18)", color: "#fff", display: "grid", placeItems: "center" }}>
            <Ico name="chat" />
          </button>
        </div>
      </div>

      <div className="member-card">
        {user ? (
          <>
            <div className="between">
              <div>
                <span className="badge gold">★ {user.tier?.name || "Thành viên"}</span>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{num(user.points)} <span style={{ fontSize: 14, color: "var(--ink-3)", fontWeight: 600 }}>điểm</span></div>
              </div>
              <button className="btn ghost sm" onClick={() => setQrOpen(true)}><Ico name="qr" size={18} /> Mã thành viên</button>
            </div>
            {home.goal > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className="progress"><div style={{ width: `${goalPct}%` }} /></div>
                <div className="muted small" style={{ marginTop: 6 }}>
                  {home.points >= home.goal ? <>Đủ điểm đổi <b>{home.reward}</b> 🎉</> : <>Còn <b>{num(home.goal - home.points)}</b> điểm để đổi <b>{home.reward}</b></>}
                </div>
              </div>
            )}
          </>
        ) : (
          <LoginCard onError={err} />
        )}
      </div>

      <div className="section grid4">
        <button className="qa" onClick={() => navigate("/menu")}><span className="ic" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}><Ico name="cup" /></span>Đặt món</button>
        <button className="qa" onClick={() => navigate("/rewards")}><span className="ic" style={{ background: "#FFF6DB", color: "#B07A00" }}><Ico name="gift" /></span>Đổi quà</button>
        <button className="qa" onClick={() => navigate("/wallet")}><span className="ic" style={{ background: "#FDECEA", color: "var(--flash)" }}><Ico name="wallet" /></span>Ví quà</button>
        <button className="qa" onClick={() => navigate("/stores")}><span className="ic" style={{ background: "#E8F0FB", color: "#2B5EA7" }}><Ico name="store" /></span>Cửa hàng</button>
      </div>

      {home.banners.length > 0 && (
        <div className="section">
          <Swiper autoplay loop dots duration={4000}>
            {home.banners.map((b, i) => (
              <Swiper.Slide key={i}>
                <div style={{ borderRadius: 16, overflow: "hidden", aspectRatio: "16 / 8", background: "#E6E2D6" }}>
                  <img src={imgUrl(b.mobile) || ""} alt={b.title || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              </Swiper.Slide>
            ))}
          </Swiper>
        </div>
      )}

      {home.flashSale && <FlashStrip sale={home.flashSale} onOpen={openProduct} />}

      {user && home.checkinEnabled && <CheckinCard home={home} onDone={() => { reloadHome(); refresh(); }} />}

      {home.promos.length > 0 && (
        <div className="section">
          <div className="section-title">Ưu đãi đang chạy</div>
          <div className="stack">
            {home.promos.map((p, i) => (
              <div key={i} style={{ borderRadius: 16, padding: 14, color: "#fff", background: p.bg }}>
                <span className="badge" style={{ background: "rgba(255,255,255,.25)", color: "#fff" }}>{p.tag}</span>
                <div className="bold" style={{ fontSize: 16, marginTop: 6 }}>{p.title}</div>
                {p.benefit && <div style={{ fontSize: 13.5, marginTop: 4, fontWeight: 600 }}>{p.benefit}</div>}
                {p.sub && <div style={{ fontSize: 12.5, marginTop: 4, opacity: 0.9 }}>{p.sub}</div>}
                <div style={{ fontSize: 11.5, marginTop: 8, opacity: 0.85 }}>{p.start} – {p.end}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {best.length > 0 && (
        <>
          <div className="section"><div className="section-title">Món bán chạy <button className="link" onClick={() => navigate("/menu")}>Xem thực đơn</button></div></div>
          <div className="hscroll">
            {best.map((p) => (
              <button key={p.id} onClick={() => openProduct(p.id)} className="card" style={{ flex: "none", width: 150, padding: 10, textAlign: "left" }}>
                <Thumb img={p.img} grad={p.grad} size={128} />
                <div className="bold clamp2" style={{ fontSize: 13.5, marginTop: 8, minHeight: 36 }}>{p.name}</div>
                <Price price={p.price} sale={p.salePrice} />
              </button>
            ))}
          </div>
        </>
      )}

      <div className="section">
        <div className="card row" style={{ gap: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: "var(--brand)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 18 }}>L</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="bold">Quan tâm Laboong trên Zalo</div>
            <div className="muted small">Nhận thông báo đơn hàng & ưu đãi mới nhất</div>
          </div>
          <button className="btn sm" onClick={async () => openSnackbar({ text: (await followShopOA()) ? "Cảm ơn bạn đã quan tâm Laboong!" : "Hãy mở trong Zalo để quan tâm OA", type: "info" })}>Quan tâm</button>
        </div>
      </div>

      {home.news.length > 0 && (
        <div className="section">
          <div className="section-title">Tin tức</div>
          <div className="stack">
            {home.news.slice(0, 5).map((n) => (
              <button key={n.id} className="card row" style={{ textAlign: "left", gap: 12 }} onClick={() => setNews(n)}>
                <Thumb img={n.image_url || (n.youtube_id ? `https://img.youtube.com/vi/${n.youtube_id}/mqdefault.jpg` : null)} size={72} />
                <div style={{ minWidth: 0 }}>
                  <div className="bold clamp2" style={{ fontSize: 14.5 }}>{n.title}</div>
                  <div className="muted small clamp2" style={{ marginTop: 4 }}>{n.excerpt}</div>
                  {n.date && <div className="muted small" style={{ marginTop: 4 }}>{n.date}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{ height: 24 }} />

      <Sheet visible={qrOpen} onClose={() => setQrOpen(false)} autoHeight mask handler swipeToClose title="Mã thành viên">
        {user && (
          <div className="sheet-body" style={{ textAlign: "center" }}>
            <div className="muted">Đưa mã này cho thu ngân để tích điểm khi mua tại quầy</div>
            <div style={{ display: "flex", justifyContent: "center", margin: "16px 0" }}><QRImage value={user.referral_code || user.phone} size={220} /></div>
            <div className="bold" style={{ fontSize: 18, letterSpacing: 1 }}>{user.referral_code}</div>
            <div className="muted" style={{ marginTop: 4 }}>{user.name} · {user.tier?.name}</div>
          </div>
        )}
      </Sheet>

      <Sheet visible={!!news} onClose={() => setNews(null)} mask handler swipeToClose height="85vh" title={news?.title}>
        {news && (
          <div className="sheet-body" style={{ overflowY: "auto", height: "100%" }}>
            {news.youtube_id ? (
              <div style={{ aspectRatio: "16 / 9", borderRadius: 12, overflow: "hidden" }}>
                <iframe src={`https://www.youtube.com/embed/${news.youtube_id}`} style={{ width: "100%", height: "100%", border: 0 }} allowFullScreen title={news.title} />
              </div>
            ) : news.image_url ? <img src={imgUrl(news.image_url) || ""} alt="" style={{ borderRadius: 12, width: "100%" }} /> : null}
            {news.date && <div className="muted small" style={{ marginTop: 10 }}>{news.date}</div>}
            <div style={{ marginTop: 10, lineHeight: 1.6, fontSize: 15 }} dangerouslySetInnerHTML={{ __html: news.body || news.excerpt }} />
          </div>
        )}
      </Sheet>
    </Page>
  );
}
