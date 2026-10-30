import React, { useEffect, useState } from "react";
import { PageHeader } from "../components/page-header";
import { Page, useNavigate, useSnackbar } from "zmp-ui";
import { LoginCard } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../state/auth";
import type { User } from "../types";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const [f, setF] = useState({ name: "", dob: "", email: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) setF({ name: user.name, dob: user.dob || "", email: user.email || "" }); }, [user]);

  const save = async () => {
    setBusy(true);
    try {
      const r = await api<{ message: string; user: User }>("/profile", { method: "PUT", body: f });
      setUser(r.user);
      openSnackbar({ text: r.message, type: "success" });
      navigate(-1);
    } catch (e: any) {
      openSnackbar({ text: e.message, type: "error" });
    } finally { setBusy(false); }
  };

  return (
    <Page className="page">
      <PageHeader title="Thông tin cá nhân" />
      {!user ? <div className="section"><LoginCard /></div> : (
        <div className="section card stack">
          <div className="field"><label>Họ và tên</label><input className="input" value={f.name} maxLength={100} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="field"><label>Số điện thoại</label><input className="input" value={user.phone} disabled style={{ background: "#F4F2EC" }} /></div>
          <div className="field"><label>Ngày sinh (nhận quà sinh nhật)</label><input className="input" type="date" value={f.dob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setF({ ...f, dob: e.target.value })} /></div>
          <div className="field"><label>Email (không bắt buộc)</label><input className="input" type="email" inputMode="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <button className="btn block" disabled={busy || f.name.trim().length < 2} onClick={save}>{busy ? "Đang lưu…" : "Lưu thông tin"}</button>
        </div>
      )}
    </Page>
  );
}
