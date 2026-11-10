"use client";

import { usePathname } from "next/navigation";
import { RouteTabs } from "@/components/ui/tabs";

export function TournamentTabs({ base, showAuction }: { base: string; showAuction: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: base, label: "Overview" },
    { href: `${base}/teams`, label: "Teams" },
    { href: `${base}/fixtures`, label: "Fixtures" },
    { href: `${base}/standings`, label: "Standings" },
    { href: `${base}/stats`, label: "Stats" },
    ...(showAuction ? [{ href: `${base}/auction`, label: "Auction" }] : []),
    { href: `${base}/chat`, label: "Chat" },
    { href: `${base}/rules`, label: "Rules" },
  ].map((i) => ({ ...i, isActive: i.href === base ? pathname === base : pathname.startsWith(i.href) }));
  return <RouteTabs items={items} />;
}
