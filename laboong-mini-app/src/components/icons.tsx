import React from "react";

/** Vài icon nét mảnh dùng riêng cho quán (zmp-ui không có ly nước, quà...). */
const paths: Record<string, React.ReactNode> = {
  cup: <><path d="M7 8h10l-1.1 11.6a1.5 1.5 0 0 1-1.5 1.4H9.6a1.5 1.5 0 0 1-1.5-1.4z" /><path d="M6.3 8h11.4" /><path d="M13.6 8 16 3.6" /></>,
  gift: <><rect x="3.5" y="8" width="17" height="4" rx="1" /><path d="M5 12v8h14v-8M12 8v12" /><path d="M12 8c-1.5-3-5-3.5-5-1.2C7 8 9.5 8 12 8zm0 0c1.5-3 5-3.5 5-1.2C17 8 14.5 8 12 8z" /></>,
  store: <><path d="M4 9.5 5.5 4h13L20 9.5" /><path d="M4 9.5c0 1.4 1.1 2.5 2.7 2.5S9.3 10.9 9.3 9.5c0 1.4 1.2 2.5 2.7 2.5s2.7-1.1 2.7-2.5c0 1.4 1.2 2.5 2.7 2.5S20 10.9 20 9.5" /><path d="M5.5 12v8h13v-8M10 20v-4.5h4V20" /></>,
  calendar: <><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M4 9.5h16M8.5 3v4M15.5 3v4" /><path d="m9 14.5 2 2 4-4" /></>,
  qr: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5zM14 18.5V20M20 14v1.5" /></>,
  bag: <><path d="M6 8h12l-1 12H7z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></>,
  flame: <path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.4 2.7-5 3.5-8.4.9 1.3 1.4 2.4 1.5 3.6 1.4-1.2 2.4-3.3 2.2-6.6C16.5 6.3 18 9.9 18 14.4 18 18.4 15.6 21 12 21z" />,
  truck: <><path d="M3 6.5h11v9.5H3zM14 10h3.8l3.2 3.2V16H14z" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>,
  wallet: <><rect x="3.5" y="6" width="17" height="13" rx="2.5" /><path d="M3.5 9.5h17M15.5 14h2" /></>,
  star: <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" />,
  home: <><path d="M4 10.5 12 4l8 6.5" /><path d="M6 9v10.5h4.5V14h3v5.5H18V9" /></>,
  receipt: <><path d="M6 3.5h12v17l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3z" /><path d="M9 8h6M9 11.5h6M9 15h4" /></>,
  user: <><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20c.8-3.7 3.8-5.8 7.5-5.8s6.7 2.1 7.5 5.8" /></>,
  chat: <><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V17A2.5 2.5 0 0 1 4 14.5z" /><path d="M8.5 9.5h7M8.5 12.5h4.5" /></>,
  right: <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />,
  left: <path d="m14.5 5.5-6.5 6.5 6.5 6.5" />,
  down: <path d="m5.5 9.5 6.5 6.5 6.5-6.5" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-3.8-3.8" /></>,
  pin: <><path d="M12 21s-6.5-6.2-6.5-11.2A6.5 6.5 0 0 1 18.5 9.8C18.5 14.8 12 21 12 21z" /><circle cx="12" cy="9.8" r="2.3" /></>,
  phone: <path d="M6.5 4h3l1.5 4-2 1.3a10 10 0 0 0 5.7 5.7l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4z" />,
  share: <><circle cx="17.5" cy="6" r="2.5" /><circle cx="6.5" cy="12" r="2.5" /><circle cx="17.5" cy="18" r="2.5" /><path d="m8.7 10.8 6.6-3.6M8.7 13.2l6.6 3.6" /></>,
  heart: <path d="M12 20s-7.5-4.5-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.5-7.5 10-7.5 10z" />,
  check: <><circle cx="12" cy="12" r="8.5" /><path d="m8.3 12.2 2.5 2.5 5-5" /></>,
  circle: <circle cx="12" cy="12" r="8.5" />,
  dot: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4" fill="currentColor" /></>,
};

export function Ico({ name, size = 22, color = "currentColor", stroke = 1.8 }: { name: keyof typeof paths | string; size?: number; color?: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths[name] || paths.cup}
    </svg>
  );
}
