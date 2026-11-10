import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { loadTournament } from "@/lib/public/page-helpers";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await loadTournament((await params).slug, "/auction");
  return { title: `Auction | ${t.name}`, alternates: { canonical: `/tournaments/${t.slug}/auction` } };
}

export default async function AuctionPage({ params }: Props) {
  const t = await loadTournament((await params).slug, "/auction");
  if (t.squad_mode !== "auction") notFound();
  // The live room and results table are built in Plan 9.
  return <EmptyState title="Auction" description="The auction schedule and results will be shown here." />;
}
