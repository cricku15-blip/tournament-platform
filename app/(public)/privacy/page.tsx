import type { Metadata } from "next";
import { LegalPage } from "@/components/domain/public/legal-page";
import { PRIVACY_SECTIONS, DEFAULT_LEGAL } from "@/lib/public/content";
import { getSiteSetting } from "@/lib/public/queries";

export const metadata: Metadata = { title: "Privacy policy", description: "How GroundWar collects, uses and protects your data.", alternates: { canonical: "/privacy" } };
export const revalidate = 300;

export default async function Page() {
  const legal = ((await getSiteSetting("legal")) as { version?: string; updated?: string } | null) ?? DEFAULT_LEGAL;
  return <LegalPage title="Privacy policy" sections={PRIVACY_SECTIONS} version={legal.version ?? DEFAULT_LEGAL.version} updated={legal.updated ?? DEFAULT_LEGAL.updated} />;
}
