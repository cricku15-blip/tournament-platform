"use client";

import * as React from "react";
import { LiveStrip } from "@/components/ui/live-strip";

/** Shows a live auction or match in the visitor's city. Cached 30 s on the server; dismissal lasts for the browser session. */
export function LiveStripLoader() {
  const [live, setLive] = React.useState<{ title: string; href: string; label: string } | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    try {
      if (sessionStorage.getItem("live-strip-dismissed") === "1") return;
    } catch {}
    const m = document.cookie.match(/(?:^|; )browsing_city=([^;]+)/);
    const city = m ? decodeURIComponent(m[1]) : "";
    const qs = /^[0-9a-f-]{36}$/i.test(city) ? `?cityId=${city}` : "";
    fetch(`/api/public/live${qs}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { live: typeof live } | null) => !cancelled && setLive(d?.live ?? null))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  if (!live) return null;
  return (
    <div onClickCapture={(e) => { if ((e.target as HTMLElement).closest("button")) { try { sessionStorage.setItem("live-strip-dismissed", "1"); } catch {} } }}>
      <LiveStrip title={live.title} href={live.href} label={live.label} />
    </div>
  );
}
