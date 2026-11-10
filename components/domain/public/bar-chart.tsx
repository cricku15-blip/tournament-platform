/** Tiny dependency-free SVG bar chart (values per match). Loaded with a dynamic import by the stats page. */
export default function BarChart({ data, label }: { data: Array<{ label: string; value: number }>; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = 36;
  const h = 120;
  return (
    <figure>
      <svg role="img" aria-label={label} viewBox={`0 0 ${Math.max(1, data.length) * w} ${h + 22}`} className="w-full max-w-xl" preserveAspectRatio="xMinYMid meet">
        {data.map((d, i) => {
          const bh = (d.value / max) * h;
          return (
            <g key={i} transform={`translate(${i * w},0)`}>
              <rect x={6} y={h - bh} width={w - 12} height={bh} rx={3} fill="var(--primary)" />
              <text x={w / 2} y={h - bh - 3} textAnchor="middle" fontSize="9" fill="var(--ink)">{d.value}</text>
              <text x={w / 2} y={h + 14} textAnchor="middle" fontSize="9" fill="var(--muted)">{d.label}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="sr-only">{data.map((d) => `${d.label}: ${d.value}`).join(", ")}</figcaption>
    </figure>
  );
}
