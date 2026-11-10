import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";

export function PlayerCard({ name, username, avatarUrl, meta }: { name: string | null; username: string | null; avatarUrl?: string | null; meta?: string }) {
  const inner = (
    <>
      <Avatar src={avatarUrl} name={name ?? "Player"} />
      <div className="min-w-0">
        <p className="truncate font-semibold text-ink">{name ?? "Player"}</p>
        {meta && <p className="truncate text-xs text-muted">{meta}</p>}
      </div>
    </>
  );
  const cls = "flex min-h-11 items-center gap-3 rounded-card border border-line bg-card p-3 hover:border-primary/50";
  return username ? (
    <Link href={`/players/${username}`} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
