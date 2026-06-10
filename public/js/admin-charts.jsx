/* global React */

/* ---- Sparkline (mini area+line) ---- */
function Sparkline({ data, color = "var(--brand)", up = true }) {
  const w = 200, h = 40, max = Math.max(...data), min = Math.min(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => [i / (data.length - 1) * w, h - ((v - min) / rng) * (h - 6) - 3]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = line + ` L${w} ${h} L0 ${h} Z`;
  const id = "sp" + Math.random().toString(36).slice(2, 7);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={color} stopOpacity="0.22" /><stop offset="1" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ---- Area chart (revenue) ---- */
function AreaChart({ data, color = "var(--brand)" }) {
  const w = 620, h = 200, pad = 14, max = Math.max(...data) * 1.12;
  const X = i => pad + i / (data.length - 1) * (w - pad * 2);
  const Y = v => h - 24 - (v / max) * (h - 44);
  const pts = data.map((v, i) => [X(i), Y(v)]);
  // smooth path
  let line = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], cx = (x0 + x1) / 2;
    line += ` C${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`;
  }
  const area = line + ` L${pts[pts.length - 1][0]} ${h - 24} L${pts[0][0]} ${h - 24} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ height: 200 }}>
      <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={color} stopOpacity="0.26" /><stop offset="1" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      {[0, 0.5, 1].map((g, i) => <line key={i} x1={pad} x2={w - pad} y1={Y(max * g)} y2={Y(max * g)} stroke="var(--line-2)" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
      <path d={area} fill="url(#rev)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.6" fill="var(--panel)" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />)}
    </svg>
  );
}

/* ---- Grouped bars (issued vs redeemed) ---- */
function GroupBars({ data, colorA = "var(--brand)", colorB = "var(--gold)" }) {
  const w = 360, h = 190, pad = 10, max = Math.max(...data.flatMap(d => [d.a, d.b])) * 1.14;
  const n = data.length, gw = (w - pad * 2) / n, bw = gw * 0.28;
  const Y = v => h - 20 - (v / max) * (h - 36);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ height: 190 }}>
      {[0, 0.5, 1].map((g, i) => <line key={i} x1={pad} x2={w - pad} y1={Y(max * g)} y2={Y(max * g)} stroke="var(--line-2)" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
      {data.map((d, i) => {
        const cx = pad + gw * i + gw / 2;
        return (
          <g key={i}>
            <rect x={cx - bw - 2} y={Y(d.a)} width={bw} height={h - 20 - Y(d.a)} rx="3" fill={colorA} />
            <rect x={cx + 2} y={Y(d.b)} width={bw} height={h - 20 - Y(d.b)} rx="3" fill={colorB} />
          </g>
        );
      })}
    </svg>
  );
}

/* ---- Donut ---- */
function Donut({ segments, total }) {
  const r = 58, sw = 22, C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg viewBox="0 0 150 150">
      <g transform="rotate(-90 75 75)">
        <circle cx="75" cy="75" r={r} fill="none" stroke="var(--hover)" strokeWidth={sw} />
        {segments.map((s, i) => {
          const frac = s.value / total;
          const dash = frac * C;
          const el = <circle key={i} cx="75" cy="75" r={r} fill="none" stroke={s.color} strokeWidth={sw}
            strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-acc * C} strokeLinecap="round" />;
          acc += frac;
          return el;
        })}
      </g>
    </svg>
  );
}

Object.assign(window, { Sparkline, AreaChart, GroupBars, Donut });
