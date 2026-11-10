export const STATUS_LABEL: Record<string, string> = {
  registration_open: "Registration open",
  registration_closed: "Registration closed",
  auction: "Auction",
  squads_locked: "Squads locked",
  live: "Live",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function statusVariant(status: string): "open" | "live" | "completed" | "cancelled" | "neutral" {
  if (status === "live") return "live";
  if (status === "registration_open") return "open";
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  return "neutral";
}

export const SQUAD_MODE_LABEL: Record<string, string> = { direct: "Direct squads", auction: "Auction" };

export const FORMAT_LABEL: Record<string, string> = {
  league: "League",
  knockout: "Knockout",
  league_playoffs: "League + playoffs",
};

export function sportEdgeClass(slug: string): string {
  return slug === "football" ? "bg-clay" : "bg-primary";
}

/** Cricket overs from balls, e.g. 83 balls -> "13.5". */
export function oversFromBalls(balls: number): string {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}
