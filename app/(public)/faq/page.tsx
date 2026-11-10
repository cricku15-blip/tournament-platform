import type { Metadata } from "next";
import { FaqList } from "@/components/domain/public/faq-list";
import { DEFAULT_FAQ } from "@/lib/public/content";
import { getSiteSetting } from "@/lib/public/queries";

export const metadata: Metadata = { title: "FAQ", description: "Answers to common questions about GroundWar.", alternates: { canonical: "/faq" } };
export const revalidate = 300;

export default async function FaqPage() {
  const raw = (await getSiteSetting("faq")) as Array<{ group?: string; q?: string; a?: string }> | null;
  const fromDb = (Array.isArray(raw) ? raw : []).filter((i) => i.q && i.a).map((i) => ({ group: i.group ?? "General", q: i.q as string, a: i.a as string }));
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 font-display text-4xl font-bold text-ink">Frequently asked questions</h1>
      <FaqList items={fromDb.length > 0 ? fromDb : DEFAULT_FAQ} />
    </div>
  );
}
