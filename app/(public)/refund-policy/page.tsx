import type { Metadata } from "next";
import { LegalPage } from "@/components/domain/public/legal-page";
import { REFUND_SECTIONS, DEFAULT_LEGAL } from "@/lib/public/content";
import { getSiteSetting } from "@/lib/public/queries";

export const metadata: Metadata = { title: "Refund policy", description: "When and how GroundWar refunds organizer fees and subscriptions.", alternates: { canonical: "/refund-policy" } };
export const revalidate = 300;

export default async function Page() {
  const legal = ((await getSiteSetting("legal")) as { version?: string; updated?: string } | null) ?? DEFAULT_LEGAL;
  return <LegalPage title="Refund policy" sections={REFUND_SECTIONS} version={legal.version ?? DEFAULT_LEGAL.version} updated={legal.updated ?? DEFAULT_LEGAL.updated} />;
}
