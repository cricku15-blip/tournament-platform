import { z } from "zod";

const uuid = z.string().uuid();
const n = z.number().int().min(0).max(100000);
const opt = <T extends z.ZodTypeAny>(s: T) => s.nullable().optional();

export const RESULT_TYPES = ["win", "tie", "draw", "no_result", "abandoned", "walkover"] as const;

export const resultSchema = z
  .object({
    matchId: uuid,
    sport: z.enum(["cricket", "football"]),
    resultType: z.enum(RESULT_TYPES, { message: "Choose how the match ended." }),
    winnerTeamId: opt(uuid),
    resultText: z.string().trim().max(200).default(""),
    pomId: opt(uuid),
    notes: z.string().max(500, "Notes can be up to 500 characters.").default(""),
    scoreA: z.record(z.string(), z.number().int().min(0).max(100000).nullable()).default({}),
    scoreB: z.record(z.string(), z.number().int().min(0).max(100000).nullable()).default({}),
    toss: opt(z.object({ winner: z.enum(["a", "b"]).optional(), decision: z.enum(["bat", "bowl"]).optional(), batted_first: z.enum(["a", "b"]).optional() })),
    batting: z.array(z.object({ innings: z.number().int().min(1).max(2), teamId: uuid, playerId: uuid, runs: n, balls: n, fours: n, sixes: n, dismissal: opt(z.string().max(40)), bowlerId: opt(uuid), fielderId: opt(uuid) })).max(40).default([]),
    bowling: z.array(z.object({ innings: z.number().int().min(1).max(2), teamId: uuid, playerId: uuid, ballsBowled: n, maidens: n, runs: n, wickets: n.max(10), wides: n, noBalls: n })).max(40).default([]),
    fielding: z.array(z.object({ playerId: uuid, catches: n, runOuts: n, stumpings: n })).max(40).default([]),
    lineups: z.array(z.object({ teamId: uuid, playerId: uuid, isStarter: z.boolean(), position: opt(z.enum(["Goalkeeper", "Defender", "Midfielder", "Forward"])) })).max(60).default([]),
    events: z.array(z.object({ type: z.enum(["goal", "own_goal", "penalty_goal", "yellow", "red", "sub"]), teamId: opt(uuid), playerId: opt(uuid), assistId: opt(uuid), minute: z.number().int().min(0).max(200).nullable().optional() })).max(80).default([]),
  })
  .superRefine((v, ctx) => {
    if ((v.resultType === "win" || v.resultType === "walkover") && !v.winnerTeamId) ctx.addIssue({ code: "custom", path: ["winnerTeamId"], message: "Choose the winning team." });
    const dup = (rows: Array<{ innings?: number; playerId: string }>, label: string) => {
      const seen = new Set<string>();
      for (const r of rows) {
        const k = `${r.innings ?? 0}:${r.playerId}`;
        if (seen.has(k)) ctx.addIssue({ code: "custom", path: [label], message: "A player appears twice in the same list." });
        seen.add(k);
      }
    };
    dup(v.batting, "batting");
    dup(v.bowling, "bowling");
    dup(v.fielding, "fielding");
    dup(v.lineups, "lineups");
  });

export type ResultPayload = z.infer<typeof resultSchema>;
