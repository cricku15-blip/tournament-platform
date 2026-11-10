import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = {
  title: "How it works",
  description: "Step by step guides for organizers, team managers and players on GroundWar.",
  alternates: { canonical: "/how-it-works" },
};

const GUIDES = {
  organizers: ["Create your tournament: sport, city, format and squad mode.", "Pay the one-time organizer fee for your tournament size and publish it.", "Approve teams and players, or run a live auction for squads.", "Generate fixtures, publish them, and enter results as matches finish.", "Standings, brackets and stats update automatically for everyone."],
  managers: ["Get an invite code from the organizer, or apply with your team.", "Once approved, build your squad: add players directly or bid in the auction.", "Stay within your purse and squad limits. The system enforces them.", "Follow your fixtures and results from your dashboard."],
  players: ["Sign up and choose your city.", "Subscribe to apply to tournaments and auctions in your city.", "Apply to a tournament, or get picked by a team.", "Your matches and stats build a public player profile."],
};

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-bold text-ink">How GroundWar works</h1>
      <p className="mt-2 text-muted">Pick your role to see the steps.</p>
      <Tabs defaultValue="organizers" className="mt-8">
        <TabsList>
          <TabsTrigger value="organizers">For organizers</TabsTrigger>
          <TabsTrigger value="managers">For managers</TabsTrigger>
          <TabsTrigger value="players">For players</TabsTrigger>
        </TabsList>
        {(Object.keys(GUIDES) as Array<keyof typeof GUIDES>).map((k) => (
          <TabsContent key={k} value={k} className="mt-6">
            <ol className="flex flex-col gap-4">
              {GUIDES[k].map((s, i) => (
                <li key={i} className="flex gap-4 rounded-card border border-line bg-card p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-display font-bold text-primary-ink">{i + 1}</span>
                  <p className="pt-1 text-ink/90">{s}</p>
                </li>
              ))}
            </ol>
          </TabsContent>
        ))}
      </Tabs>
      <aside className="mt-8 rounded-card border border-line bg-surface p-4 text-sm text-muted">
        <strong className="text-ink">About money:</strong> GroundWar charges only the organizer fee and the player subscription. Entry fees and prizes between users are handled by the organizer, outside the platform. Auction points are virtual.
      </aside>
      <div className="mt-8 flex gap-3">
        <Button asChild><Link href="/signup">Get started</Link></Button>
        <Button asChild variant="secondary"><Link href="/pricing">See pricing</Link></Button>
      </div>
    </div>
  );
}
