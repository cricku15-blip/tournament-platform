import Link from "next/link";
import { TeamLogo } from "@/components/ui/team-logo";

export function TeamCard({ href, name, logoUrl, squadSize, homeGround }: { href: string; name: string | null; logoUrl: string | null; squadSize?: number | null; homeGround?: string | null }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-card border border-line bg-card p-4 hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-primary">
      <TeamLogo src={logoUrl} name={name ?? "Team"} size="md" />
      <div className="min-w-0">
        <p className="truncate font-display text-lg font-bold text-ink">{name}</p>
        <p className="truncate text-xs text-muted">
          {squadSize !== null && squadSize !== undefined ? `${squadSize} players` : ""}
          {homeGround ? ` · ${homeGround}` : ""}
        </p>
      </div>
    </Link>
  );
}
