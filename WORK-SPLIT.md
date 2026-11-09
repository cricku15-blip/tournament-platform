# WORK-SPLIT.md: two agents, one product

Agents: **Claude Code (C)** and **Antigravity (A)**. Codex is not used; everything originally assigned to Codex (X) now belongs to Antigravity (A).
All agents: read `RULES.md`, `tournament-platform-web-spec.md`, and your plan before coding. `RULES.md` wins on conflicts.

## Coordination rules (so three agents don't collide)
1. One git branch per plan: `plan-N-<name>`. Never commit to another agent's branch. Merge to `main` only after the plan's acceptance checks pass.
2. Plan 1 owns `supabase/migrations/` and `types/supabase.ts`. Nobody else edits migrations. Need a schema change? Add a line to `HANDOFF.md` under "Backend requests"; Claude adds the next-numbered migration.
3. Plan 2 owns shared files (`components/ui`, `lib/rpc.ts`, `lib/errors.ts`, layout shells, message catalogue). Others add files, and only append to shared ones.
4. When a plan finishes, its owner writes a short entry in `HANDOFF.md`: branch, what's done, skipped items, env vars, open questions.
5. Open decisions in spec section 28 are asked of the owner, never guessed.

## Phases and owners

| Phase | Plan | Owner | Why |
|---|---|---|---|
| 1 (first, alone) | 1 Supabase backend | **C** | Security, RLS, money, auction locking. Everything depends on it. |
| 2 (after Plan 1 types exist) | 2 Web foundation | **A** | Mechanical scaffolding against fixed spec |
| 3 (parallel, after Plan 2) | 4 Public site | **A** | Page-heavy, SEO, visual |
| 3 | 3 Auth/onboarding/account | **A** | Forms + Zod + flows |
| 3 | 6 Payments/subscription | **C** | Razorpay, webhook, money safety |
| 4 (parallel) | 5 Organizer workspace | **A** | Wizard UI |
| 4 | 7 Teams/players/squads | **A** | |
| 4 | 8 Fixtures/results/stats | **C** | Standings logic, aggregates |
| 5 | 9 Auction/chat/realtime | **C** | Hardest; RULES section 5 |
| 6 | 10 Admin/hardening/launch | Admin pages **A**, load tests + security **C**, test suites/CI **A** | |

Note: plans 5 to 9 list "Depends on" earlier plans. The phase 4 parallelism is only safe if the shared pieces from plans 2 to 3 are merged first; otherwise run 5, 7, 8 in order.

## Start prompts

**Claude:** "Read RULES.md, tournament-platform-web-spec.md, WORK-SPLIT.md and plan-1-supabase-backend.md. Execute Plan 1 task by task on branch plan-1-supabase-backend, tick each checkbox, stop at each manual dashboard step."

**Antigravity (when its phase starts):** "Read RULES.md, tournament-platform-web-spec.md, WORK-SPLIT.md, HANDOFF.md and plan-N-*.md. You own plan N only. Work on branch plan-N-<name>, follow tasks in order, tick checkboxes, and log to HANDOFF.md when done."

## Antigravity order (it owns plans 2, 3, 4, 5, 7, plus admin pages and tests/CI)
Run strictly one after another, not in parallel: **2, then 3, then 4, then 5, then 7**. Claude does plans 6, 8, 9 and security/load tests in between, on separate branches, and only touches shared files by appending.
