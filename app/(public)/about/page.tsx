import type { Metadata } from "next";

export const metadata: Metadata = { title: "About", description: "Why we built GroundWar for local sports communities.", alternates: { canonical: "/about" } };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-bold text-ink">About GroundWar</h1>
      <p className="mt-4 text-lg text-ink/90">Local tournaments run on WhatsApp groups and spreadsheets. We think they deserve better.</p>
      <p className="mt-4 text-ink/90">GroundWar gives organizers one place to register teams, run a fair live auction, schedule fixtures, publish results and keep standings and player stats up to date. Players get a public profile that follows them from season to season.</p>
      <p className="mt-4 text-ink/90">We start city by city, so every tournament stays local and every player has a real game to turn up for.</p>
    </div>
  );
}
