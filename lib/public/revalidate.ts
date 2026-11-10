import { revalidateTag } from "next/cache";

/** Tags used by public pages. Call after publish, result, registration or announcement changes. */
export function revalidateTournament(opts: { id: string; slug?: string; teamIds?: string[]; playerUsernames?: string[] }) {
  revalidateTag(`tournament:${opts.id}`, { expire: 0 });
  revalidateTag("tournaments", { expire: 0 });
  if (opts.slug) revalidateTag(`tournament-slug:${opts.slug}`, { expire: 0 });
  for (const u of opts.playerUsernames ?? []) revalidateTag(`player:${u}`, { expire: 0 });
}
