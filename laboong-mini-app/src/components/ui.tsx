import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { imgUrl, money } from "../lib/format";
import { useAuth } from "../state/auth";
import { Ico } from "./icons";
import flashIcon from "../static/flash-sale.png";
import loadingIcon from "../static/loading.png";

export function Thumb({ img, grad, size = 64, radius = 14 }: { img?: string | null; grad?: string; size?: number; radius?: number }) {
  const src = imgUrl(img);
  return (
    <div className="thumb" style={{ width: size, height: size, borderRadius: radius, background: src ? "#F1EFE7" : grad || "linear-gradient(150deg,#0F623F,#1AA86A)" }}>
      {src ? <img src={src} alt="" loading="lazy" /> : <Ico name="cup" size={size * 0.45} color="#fff" />}
    </div>
  );
}

export function Price({ price, sale, flash }: { price: number; sale?: number | null; flash?: boolean }) {
  const has = sale != null && sale < price;
  return (
    <span className="row" style={{ gap: 6, alignItems: "baseline" }}>
      <span className={flash ? "flash-price" : "price"}>{money(has ? sale! : price)}</span>
      {has && <span className="strike">{money(price)}</span>}
    </span>
  );
}

export const FLASH_ICON = flashIcon;

/** Nhãn khuyến mãi của món; món flash sale có icon flash sale phía trước. */
export function PromoBadge({ label, flash }: { label: string | null; flash?: boolean }) {
  if (!label) return null;
  return (
    <span className="row" style={{ gap: 4, marginTop: 4, display: "inline-flex" }}>
      {flash && <img src={flashIcon} alt="" width={20} height={20} style={{ width: 20, height: 20 }} />}
      <span className="badge red">{label}</span>
    </span>
  );
}

export function Stepper({ value, onChange, min = 0, max = 99 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <span className="stepper">
      <button aria-label="Bớt" disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
      <span>{value}</span>
      <button aria-label="Thêm" disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
    </span>
  );
}

export function Empty({ icon = "🧋", title, sub, action }: { icon?: string; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <div className="big">{icon}</div>
      <div className="bold" style={{ color: "var(--ink)", fontSize: 16 }}>{title}</div>
      {sub && <div className="muted" style={{ marginTop: 6 }}>{sub}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

/** Vòng xoay chờ của Laboong (8 vạch xanh, xoay theo nấc). */
export function Spin({ size = 40 }: { size?: number }) {
  return <img src={loadingIcon} alt="" width={size} height={size} className="lb-spin" style={{ width: size, height: size }} />;
}

export function Loading({ text = "Đang tải…" }: { text?: string }) {
  return (
    <div className="empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <Spin />
      <div className="muted">{text}</div>
    </div>
  );
}

export function ErrorBox({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div className="card" style={{ margin: 16, background: "#FDECEA", borderColor: "#F6CFC9", color: "var(--danger)" }}>
      <div className="bold">{text}</div>
      {onRetry && <button className="btn sm danger" style={{ marginTop: 10 }} onClick={onRetry}>Thử lại</button>}
    </div>
  );
}

/** Mã QR (thẻ thành viên, mã quà) để thu ngân quét ở quầy. */
export function QRImage({ value, size = 200 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string>("");
  useEffect(() => {
    QRCode.toDataURL(value, { margin: 1, width: size * 2, color: { dark: "#0F3D28", light: "#FFFFFF" } }).then(setSrc).catch(() => setSrc(""));
  }, [value, size]);
  return src ? <img src={src} width={size} height={size} alt={value} style={{ width: size, height: size, imageRendering: "pixelated" }} /> : <div style={{ width: size, height: size }} />;
}

/** Thẻ mời đăng nhập bằng Zalo (đặt hàng, tích điểm, đổi quà đều cần tài khoản). */
export function LoginCard({ title = "Đăng nhập để tích điểm & đặt hàng", sub, onError }: { title?: string; sub?: string; onError?: (msg: string) => void }) {
  const { login, loggingIn } = useAuth();
  return (
    <div className="card" style={{ textAlign: "center", padding: 20 }}>
      <div style={{ fontSize: 40 }}>🧋</div>
      <div className="bold" style={{ fontSize: 16.5, marginTop: 6 }}>{title}</div>
      <div className="muted" style={{ marginTop: 6, lineHeight: 1.5 }}>
        {sub || "Dùng tài khoản Zalo của bạn. Lần đầu, Zalo sẽ hỏi chia sẻ số điện thoại để tạo thẻ thành viên Laboong (tặng điểm chào mừng)."}
      </div>
      <button className="btn block" style={{ marginTop: 14 }} disabled={loggingIn}
        onClick={() => login().catch((e) => onError?.(e.message || "Đăng nhập không thành công"))}>
        {loggingIn ? "Đang đăng nhập…" : "Đăng nhập bằng Zalo"}
      </button>
    </div>
  );
}
