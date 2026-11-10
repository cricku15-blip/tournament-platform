import type { Metadata } from "next";
import { LegalPage } from "@/components/domain/public/legal-page";
import { TERMS_SECTIONS, DEFAULT_LEGAL } from "@/lib/public/content";
import { getSiteSetting } from "@/lib/public/queries";

export const metadata: Metadata = { title: "Terms of service", description: "The rules for using GroundWar.", alternates: { canonical: "/terms" } };
export const revalidate = 300;

export default async function Page() {
  const legal = ((await getSiteSetting("legal")) as { version?: string; updated?: string } | null) ?? DEFAULT_LEGAL;
  return <LegalPage title="Terms of service" sections={TERMS_SECTIONS} version={legal.version ?? DEFAULT_LEGAL.version} updated={legal.updated ?? DEFAULT_LEGAL.updated} />;
}
