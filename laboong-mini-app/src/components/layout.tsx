import React from "react";
import { AnimationRoutes, BottomNavigation, Route, useLocation, useNavigate } from "zmp-ui";
import { useCart } from "../state/cart";
import { Ico } from "./icons";
import HomePage from "../pages/home";
import MenuPage from "../pages/menu";
import CartPage from "../pages/cart";
import OrderDonePage from "../pages/order-done";
import OrdersPage from "../pages/orders";
import MemberPage from "../pages/member";
import PointsPage from "../pages/points";
import RewardsPage from "../pages/rewards";
import WalletPage from "../pages/wallet";
import ProfilePage from "../pages/profile";
import AddressesPage from "../pages/addresses";
import StoresPage from "../pages/stores";

const TABS = [
  { key: "/", label: "Trang chủ", icon: <Ico name="home" size={24} /> },
  { key: "/menu", label: "Thực đơn", icon: <Ico name="cup" size={24} /> },
  { key: "/cart", label: "Giỏ hàng", icon: <Ico name="bag" size={24} /> },
  { key: "/orders", label: "Đơn hàng", icon: <Ico name="receipt" size={24} /> },
  { key: "/member", label: "Thành viên", icon: <Ico name="user" size={24} /> },
];

function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { count } = useCart();
  if (!TABS.some((t) => t.key === location.pathname)) return null;
  return (
    <BottomNavigation fixed activeKey={location.pathname} onChange={(key) => navigate(key, { animate: false })}>
      {TABS.map((t) => (
        <BottomNavigation.Item key={t.key} label={t.label}
          icon={t.key === "/cart" && count > 0 ? <span style={{ position: "relative" }}>{t.icon}<span className="cart-dot">{count > 99 ? "99+" : count}</span></span> : t.icon} />
      ))}
    </BottomNavigation>
  );
}

export function Layout() {
  return (
    <>
      <AnimationRoutes>
        <Route path="/" element={<HomePage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/order-done" element={<OrderDonePage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/member" element={<MemberPage />} />
        <Route path="/points" element={<PointsPage />} />
        <Route path="/rewards" element={<RewardsPage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/addresses" element={<AddressesPage />} />
        <Route path="/stores" element={<StoresPage />} />
      </AnimationRoutes>
      <BottomNav />
    </>
  );
}
