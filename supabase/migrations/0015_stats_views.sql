-- 0015_stats_views.sql
-- Leaderboards and career stats. Views run with owner rights and only count PUBLISHED results of PUBLISHED tournaments.
-- If these get slow at scale, convert to materialized views refreshed by publish_match_result (see RULES.md section 2).

alter table public.football_lineups add column position text;   -- 'Goalkeeper','Defender','Midfielder','Forward' (needed for clean sheets)

create or replace view public.tournament_batting_stats as
select m.tournament_id, b.player_id,
       count(distinct b.match_id) as matches,
       sum(b.runs)  as runs,  sum(b.balls) as balls, sum(b.fours) as fours, sum(b.sixes) as sixes,
       max(b.runs)  as highest_score,
       count(*) filter (where b.dismissal is not null and b.dismissal <> 'Not out') as dismissals,
       case when sum(b.balls) > 0 then round(sum(b.runs) * 100.0 / sum(b.balls), 2) end as strike_rate
from public.cricket_batting b
join public.matches m on m.id = b.match_id
where m.result_published_at is not null and public.tournament_is_published(m.tournament_id)
group by m.tournament_id, b.player_id;

create or replace view public.tournament_bowling_stats as
select m.tournament_id, w.player_id,
       count(distinct w.match_id) as matches,
       sum(w.balls_bowled) as balls_bowled, sum(w.maidens) as maidens, sum(w.runs) as runs_conceded, sum(w.wickets) as wickets,
       case when sum(w.balls_bowled) > 0 then round(sum(w.runs) * 6.0 / sum(w.balls_bowled), 2) end as economy,
       (array_agg(w.wickets::text || '/' || w.runs::text order by w.wickets desc, w.runs asc))[1] as best_figures
from public.cricket_bowling w
join public.matches m on m.id = w.match_id
where m.result_published_at is not null and public.tournament_is_published(m.tournament_id)
group by m.tournament_id, w.player_id;

create or replace view public.tournament_fielding_stats as
select m.tournament_id, f.player_id, sum(f.catches) as catches, sum(f.run_outs) as run_outs, sum(f.stumpings) as stumpings
from public.cricket_fielding f
join public.matches m on m.id = f.match_id
where m.result_published_at is not null and public.tournament_is_published(m.tournament_id)
group by m.tournament_id, f.player_id;

create or replace view public.tournament_football_stats as
with pub as (
  select id, tournament_id, team_a_id, team_b_id, score_a, score_b from public.matches
  where result_published_at is not null and public.tournament_is_published(tournament_id)
), ev as (
  select p.tournament_id, e.player_id,
         count(*) filter (where e.type in ('goal','penalty_goal')) as goals,
         count(*) filter (where e.type = 'yellow') as yellow_cards,
         count(*) filter (where e.type = 'red')    as red_cards
  from public.football_events e join pub p on p.id = e.match_id where e.player_id is not null group by p.tournament_id, e.player_id
), asst as (
  select p.tournament_id, e.assist_player_id as player_id, count(*) as assists
  from public.football_events e join pub p on p.id = e.match_id
  where e.assist_player_id is not null and e.type in ('goal','penalty_goal') group by p.tournament_id, e.assist_player_id
), mp as (
  select p.tournament_id, l.player_id, count(*) as matches
  from public.football_lineups l join pub p on p.id = l.match_id group by p.tournament_id, l.player_id
), cs as (
  select p.tournament_id, l.player_id, count(*) as clean_sheets
  from public.football_lineups l join pub p on p.id = l.match_id
  where l.is_starter and l.position = 'Goalkeeper'
    and ((l.team_id = p.team_a_id and coalesce((p.score_b->>'goals')::int, 0) = 0)
      or (l.team_id = p.team_b_id and coalesce((p.score_a->>'goals')::int, 0) = 0))
  group by p.tournament_id, l.player_id
), base as (
  select tournament_id, player_id from mp union select tournament_id, player_id from ev union select tournament_id, player_id from asst
)
select base.tournament_id, base.player_id,
       coalesce(mp.matches, 0) as matches, coalesce(ev.goals, 0) as goals, coalesce(asst.assists, 0) as assists,
       coalesce(ev.yellow_cards, 0) as yellow_cards, coalesce(ev.red_cards, 0) as red_cards, coalesce(cs.clean_sheets, 0) as clean_sheets
from base
left join mp   using (tournament_id, player_id)
left join ev   using (tournament_id, player_id)
left join asst using (tournament_id, player_id)
left join cs   using (tournament_id, player_id);

create or replace view public.player_cricket_career as
select player_id, sum(matches) as matches, sum(runs) as runs, sum(balls) as balls, sum(fours) as fours, sum(sixes) as sixes, max(highest_score) as highest_score
from public.tournament_batting_stats group by player_id;

create or replace view public.player_bowling_career as
select player_id, sum(matches) as matches, sum(wickets) as wickets, sum(runs_conceded) as runs_conceded, sum(balls_bowled) as balls_bowled
from public.tournament_bowling_stats group by player_id;

create or replace view public.player_football_career as
select player_id, sum(matches) as matches, sum(goals) as goals, sum(assists) as assists, sum(yellow_cards) as yellow_cards,
       sum(red_cards) as red_cards, sum(clean_sheets) as clean_sheets
from public.tournament_football_stats group by player_id;

grant select on public.tournament_batting_stats, public.tournament_bowling_stats, public.tournament_fielding_stats,
                public.tournament_football_stats, public.player_cricket_career, public.player_bowling_career,
                public.player_football_career to anon, authenticated;
