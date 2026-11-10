import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

export function ogCard({ eyebrow, title, subtitle, accent = "#22F08A" }: { eyebrow: string; title: string; subtitle?: string; accent?: string }) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#050806", color: "#fff", padding: 64 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 32, fontWeight: 700 }}>
          <div style={{ width: 16, height: 48, background: accent }} />
          GROUNDWAR
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 30, color: "#7FE3B0", textTransform: "uppercase", letterSpacing: 2 }}>{eyebrow}</div>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}>{title.slice(0, 80)}</div>
          {subtitle && <div style={{ fontSize: 34, color: "#BFE9D2" }}>{subtitle.slice(0, 100)}</div>}
        </div>
      </div>
    ),
    OG_SIZE
  );
}
