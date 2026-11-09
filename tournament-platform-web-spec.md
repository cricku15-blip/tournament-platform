# Sports Tournament Platform: Web Application Specification

**Document type:** Product and web specification (concept, pages, flows, look and feel)
**Scope:** The **web** application only (Next.js + Supabase). The Flutter mobile app is specified separately and must reuse the same backend rules described here.
**Launch sports:** Cricket and Football (built as a configurable sport system so more sports can be added later)
**Status:** Draft v1. Items marked **[OPEN]** are decisions still to be made.

> Money note: this document describes the *payment features as product flows* (what the user sees and what the system does). It deliberately contains **no earnings projections, cost estimates, or marketing budgets**. All prices (tournament tier fees, player subscription) are **admin-configurable values**, never hard-coded.

---

## Table of Contents

1. Project overview
2. Glossary
3. Users, roles, and permissions
4. Web architecture and tech stack
5. Design system (how everything looks)
6. Global layout and navigation
7. Site map and page count
8. Public pages (spec)
9. Auth and onboarding pages (spec)
10. Account pages (spec)
11. Player workspace and application pages (spec)
12. Manager workspace pages (spec)
13. Organizer workspace pages (spec)
14. Tournament creation form (every field)
15. Sport configuration: Cricket and Football
16. Fixture formats and standings logic
17. Auction system (spec)
18. Chat (spec)
19. Notifications (spec)
20. Payment flows (product level)
21. Admin panel pages (spec)
22. Data model
23. Backend rules (RLS, database functions, edge functions)
24. SEO, sharing, and public data
25. Edge cases and error handling
26. Microcopy and tone
27. Build phases for the web app
28. Open decisions

---

## 1. Project overview

### 1.1 What this product is
A platform where people in a city can **organize**, **join**, and **follow** local sports tournaments. It covers the whole life of a tournament: creating it, bringing in teams, getting players onto those teams (either through a live **player auction** or by managers adding their own players), scheduling matches, recording results and player stats, and showing standings and leaderboards.

### 1.2 The one-sentence pitch
"Run your local tournament, auction your players, and track every match, all in one place."

### 1.3 Who uses it
| Person | What they want |
|---|---|
| **Organizer** | A fast way to set up a tournament, collect teams and players, run an auction, publish fixtures and results without spreadsheets and WhatsApp chaos |
| **Team manager** | To get their team into a tournament, build a squad, bid for players in the auction, and see their fixtures |
| **Player** | To be discovered, apply to auctions and tournaments in their city, see which team picked them, and build a stats history |
| **Spectator (anyone)** | To follow tournaments in any city: fixtures, results, standings, live auctions |
| **Platform admin (the owner)** | To see everything, handle payments, refunds, disputes, bans, and configure sports, cities, and pricing |

### 1.4 Core principles
1. **One account, many roles.** A user is never "an organizer account" or "a player account". Roles come from what they do (create a tournament, be assigned to a team, register as a player).
2. **Browse everywhere, play locally.** Anyone can view tournaments in all cities. A player can only **apply** in tournaments of the city currently selected on their profile.
3. **The platform stays out of private money.** Auction values are virtual points. Entry fees and any money between players, managers, and organizers are settled by them outside the app. The platform only charges its own two fees: the **organizer tournament fee** (one time per tournament) and the **player subscription** (monthly).
4. **The backend is the referee.** Every rule (city match, subscription active, purse limits, squad limits, who can edit what) is enforced in the database and server functions. The web UI only reflects those rules; it never is the only guard.
5. **Sport rules are data, not code.** Squad sizes, match formats, scoring fields, and standings rules come from a sport configuration.

---

## 2. Glossary

| Term | Meaning |
|---|---|
| **Tournament** | One competition with a sport, city, format, teams, fixtures, and results |
| **Organizer** | The user who created a tournament and controls it |
| **Team** | A named squad inside one tournament (team identity can be reused across tournaments by the same manager) |
| **Manager** | A user assigned to run one team in one tournament |
| **Player** | A user with a player profile who applies to auctions and tournaments |
| **Squad mode** | How players reach teams: **Auction** or **Direct** (managers add players) |
| **Pool** | The list of approved players available in an auction |
| **Lot** | One player put up for bidding at a moment in the auction |
| **Purse** | The virtual points budget each team has in an auction |
| **Base price** | The starting bid (in points) for a player or player category |
| **Auctioneer** | The organizer when running the live auction |
| **Tier fee** | The one-time fee an organizer pays, based on the number of teams, to publish a tournament |
| **Player subscription** | The monthly plan a player needs to apply to any auction or tournament |
| **Slug** | The readable part of a URL, e.g. `raipur-premier-league-2026` |
| **RLS** | Row Level Security in Supabase: database rules deciding who can read/write each row |

---

## 3. Users, roles, and permissions

### 3.1 How roles work
There is **one user account**. The role switcher in the header only changes *which workspace and menu the user sees*; it does not change who they are. A user can be, at the same time:

- **Player:** has a player profile (sport, position, etc.).
- **Organizer:** owns one or more tournaments.
- **Manager:** is assigned to one or more teams in specific tournaments.
- **Admin:** a special flag set only by the platform owner in the database.

The role switcher only lists roles the user actually has. A brand-new user sees only "Player" until they create a tournament (Organizer appears) or accept a team invite (Manager appears).

### 3.2 Permission matrix (web)
`R` = read, `C` = create, `U` = update, `D` = delete, `-` = none, `own` = only their own records

| Resource | Visitor (logged out) | Player | Manager (own team) | Organizer (own tournament) | Admin |
|---|---|---|---|---|---|
| Public tournament pages | R | R | R | R | R |
| Tournament (draft/edit) | - | - | - | C, U, D(draft) | R, U, D |
| Teams in tournament | R | R | U own team | C, U, D | R, U, D |
| Player profile | R (public fields) | C, U own | R | R | R, U |
| Apply as player | - | C (needs city match + active subscription) | - | - | - |
| Approve/reject player applications | - | - | - | U | U |
| Team squad | R | R | C, U (direct mode) | C, U | U |
| Auction console | - | - | - | Full control | Full (support) |
| Bid in auction | - | - | C (own team only, on own turn rules) | - | - |
| Match results and stats | R | R | R | C, U | U |
| Chat | R (public tournaments: read-only preview) | C (if member) | C | C + moderate | Moderate |
| Own subscription | - | R, manage | R, manage (if also a player) | R, manage (if also a player) | R any |
| Organizer fee payment | - | - | - | C, R own | R any, refund |
| Admin panel | - | - | - | - | Full |

### 3.3 Who counts as a "member" of a tournament
A user is a member of a tournament if they are: the organizer, a manager of a team in it, or a player with an approved application or a squad spot in it. Members can use that tournament's chat and see member-only notices.

---

## 4. Web architecture and tech stack

### 4.1 Stack
| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Server rendering for public SEO pages, client interactivity for workspaces and the live auction |
| Styling | **Tailwind CSS** with design tokens as CSS variables | Fast, consistent, easy dark mode |
| UI primitives | **Radix UI** (accessible dialogs, tabs, menus) wrapped in the project's own components | Accessibility without a "stock template" look |
| Forms | **React Hook Form + Zod** | One validation schema shared by client and server actions |
| Data fetching | Server Components for reads; **TanStack Query** for live/interactive client data | |
| Backend | **Supabase**: Postgres, Auth, Realtime, Storage, Edge Functions | |
| Realtime | Supabase Realtime (Broadcast for auction events, Postgres Changes for chat) | |
| Payments | **Razorpay** Orders (organizer fee) and Subscriptions (player plan), confirmed by **webhooks** | |
| Email | A transactional email provider via SMTP/API (e.g. Resend) | Magic links, receipts, notices |
| Images | Supabase Storage with automatic resizing via Next Image | |
| i18n | `next-intl` set up from day one, English first **[OPEN: Hindi at launch?]** | |
| Testing | Vitest (logic), Playwright (key flows: sign up, create tournament, apply, auction) | |

### 4.2 Rendering strategy per area
| Area | Rendering |
|---|---|
| Landing, pricing, FAQ, legal | Static (ISR) |
| Tournament list, tournament pages, team/player/match pages, city pages | Server-rendered with revalidation (SEO) |
| Dashboards and workspaces (player, manager, organizer, admin) | Server-rendered shell + client data |
| Live auction room and console | Fully client-side with Realtime |
| Chat | Client-side with Realtime |

### 4.3 Folder structure (App Router)
```
app/
  (public)/            landing, how-it-works, pricing, about, faq, contact, legal
  (public)/tournaments/...
  (public)/players/[username]
  (public)/cities/[city]
  (auth)/login, signup, auth/check-email, auth/callback, onboarding
  (app)/dashboard, profile, settings, subscription, notifications, join/[code]
  (app)/player/...
  (app)/manager/...
  (app)/organizer/...
  (admin)/admin/...
components/ui         buttons, inputs, tabs, tables, dialogs...
components/domain     TournamentCard, FixtureRow, AuctionLot, StandingsTable...
lib/supabase          server and browser clients
lib/validation        Zod schemas
lib/sports            sport configuration loaders
```

### 4.4 Authentication approach (launch)
- **Google sign-in** and **email** (magic link or one-time code, no passwords).
- Phone OTP is a planned later addition **[OPEN]**.
- Sessions use Supabase Auth cookies so server-rendered pages know the user.
- Route protection is done by middleware (redirect to `/login?next=...`) **and** by RLS (so direct API access is also blocked).

---

## 5. Design system (how everything looks)

### 5.1 Design idea
**"Stadium floodlights."** The product should feel like the moment a ground lights up on match night: confident, energetic, and local, not like a generic dashboard. The memorable element is the **scoreboard language**: condensed numerals, fixture "tickets", and a live strip that appears wherever something is happening now (a live auction, a match in progress). Everything else stays calm and quiet so that strip and the numbers stand out.

### 5.2 Color tokens
All colors are CSS variables so light and dark mode swap cleanly.

| Token | Name | Light | Dark | Used for |
|---|---|---|---|---|
| `--ink` | Night Ink | `#0F2A43` | `#E8EEF4` | Main text (light), main text (dark) |
| `--surface` | Chalk | `#F5F7F9` | `#0B1A2A` | Page background |
| `--card` | Paper | `#FFFFFF` | `#122438` | Cards, panels |
| `--line` | Line | `#DCE3EA` | `#24384D` | Borders, dividers |
| `--primary` | Turf | `#1F7A4D` | `#3BB679` | Primary buttons, links, success-adjacent actions |
| `--primary-ink` | On Turf | `#FFFFFF` | `#08210F` | Text on primary |
| `--floodlight` | Floodlight | `#FFB300` | `#FFC233` | **Live** things: live auction, live match, current bid |
| `--clay` | Clay | `#C8553D` | `#E3735A` | Warnings, red cards, "going twice" |
| `--danger` | Signal | `#D92D20` | `#F2554A` | Errors, destructive actions |
| `--muted` | Mist | `#5F7389` | `#93A7BB` | Secondary text |

Rules:
- Floodlight (amber) is reserved for **live/now** states so it keeps its meaning. It is never used for decoration.
- Body text on `--surface` and `--card` must meet WCAG AA contrast (4.5:1).
- Sport tinting: a small sport icon and a 3 px top edge on tournament cards; cricket cards use `--primary`, football cards use `--ink`. No other sport-colored backgrounds.

### 5.3 Typography
| Role | Typeface | Weights | Notes |
|---|---|---|---|
| Display and numerals (scores, bids, standings, page titles) | **Barlow Condensed** | 600, 700 | Scoreboard feel; tabular numbers on for all numeric columns |
| Body and UI | **Figtree** | 400, 500, 600 | Friendly, very legible at small sizes on phones |

Type scale (desktop / mobile), sentence case everywhere, no all-caps labels:
| Style | Desktop | Mobile | Line height |
|---|---|---|---|
| Display XL (landing hero) | 72 px | 44 px | 1.0 |
| H1 | 44 px | 32 px | 1.1 |
| H2 | 32 px | 26 px | 1.15 |
| H3 | 24 px | 21 px | 1.2 |
| Body L | 18 px | 17 px | 1.55 |
| Body | 16 px | 16 px | 1.55 |
| Small | 14 px | 14 px | 1.45 |
| Scoreboard number | 56 px | 40 px | 1.0 |

Line length for paragraphs: maximum about 70 characters.

### 5.4 Spacing, shape, elevation
- Spacing scale (px): 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Page max width 1200 px; content columns inside that. Workspaces use a 240 px sidebar plus fluid content.
- Radius: **8 px** for inputs and buttons, **14 px** for cards, **999 px** for badges and chips. (Different radii for different jobs, not one radius everywhere.)
- Elevation: cards use a 1 px `--line` border and **no shadow** at rest. A single soft shadow appears only on floating things (menus, dialogs, toasts).
- Fixture "ticket" card: a notch cut on the left and right edges (CSS mask) with a dashed divider between the two teams' side and the details side.

### 5.5 Core components
| Component | Look and behaviour |
|---|---|
| **Primary button** | Turf fill, white text, 44 px tall, 8 px radius. Hover darkens 6%. Disabled at 45% opacity with a not-allowed cursor. Loading state replaces the label with a spinner and keeps the width |
| **Secondary button** | 1.5 px `--ink` outline, transparent fill |
| **Destructive button** | Signal red fill; always opens a confirm dialog first |
| **Text input** | 44 px tall, `--card` fill, 1 px `--line`; focus ring 2 px Turf with 2 px offset; label above, helper text below, error text in Signal with an icon |
| **Select / city picker** | Searchable combobox; keyboard accessible |
| **Tabs** | Underline tabs; active tab has a 3 px Turf underline; scrollable on mobile with edge fade |
| **Badge** | Pill. Status colors: Draft (Mist), Open (Turf), Live (Floodlight with a pulsing dot), Completed (Ink), Cancelled (Signal) |
| **Card** | Paper fill, 14 px radius, 1 px line, 20 px padding |
| **Table** | Sticky header, zebra off, row hover tint; on mobile tables turn into stacked rows |
| **Dialog** | Centered, max 520 px, dims background, closes with Esc, traps focus |
| **Toast** | Bottom-right (bottom-center on mobile), 5 s, includes the same verb as the button that caused it ("Published." after "Publish") |
| **Skeleton** | Same shape as final content; shimmer is disabled when the user prefers reduced motion |
| **Empty state** | Small line illustration + one sentence of what to do + one button |
| **Live strip** | A 40 px bar under the header showing a pulsing Floodlight dot + "Live now: Raipur Premier League auction, Lot 14 of 60" with a Watch link. Hidden when nothing is live in the user's city |

### 5.6 Iconography and imagery
- Icon set: **Lucide**, 1.75 px stroke, 20 px default.
- Sport icons (cricket bat/ball, football) drawn in the same stroke style.
- Images: user-uploaded logos, banners, and avatars. No stock photography. Fallbacks are generated: team logo fallback = team initials on a color derived from the team name; avatar fallback = initials.
- Tournament banner: 16:9, shown with a darkening gradient only behind text.

### 5.7 Motion
- No scroll-triggered entrance animations and no hover animation on every card.
- **One orchestrated moment:** on the landing hero, the sample scoreboard numbers count up once on load.
- **Action-driven motion only:** a bid placed makes the current bid number slide up and flash Floodlight for 400 ms; "Sold" stamps in with a short scale pop; tabs and accordions animate open/closed at 180 ms.
- `prefers-reduced-motion` disables the count-up, flash, and pop.

### 5.8 Responsive behaviour
| Breakpoint | Width | Behaviour |
|---|---|---|
| Mobile | under 640 px | Single column; bottom tab bar for workspaces; tables become stacked cards |
| Tablet | 640 to 1023 px | Two columns where useful; collapsible sidebar |
| Desktop | 1024 px and up | Sidebar + content; side-by-side panels in the auction console |

The live auction room is designed **phone first** (managers bid from phones) and then expanded for desktop.

### 5.9 Accessibility baseline
- Visible keyboard focus on everything interactive.
- All images have alt text (user content: team/player name).
- Color is never the only signal (badges also have text and icons).
- Minimum touch target 44 x 44 px.
- Forms: labels tied to inputs, errors announced to screen readers, errors listed at the top of long forms with anchor links.
- Live auction updates are announced politely (`aria-live="polite"`) so a screen reader hears "New bid, Team Falcons, 120 points".
- Respect `prefers-color-scheme` on first visit; the user can override in Settings.

---

## 6. Global layout and navigation

### 6.1 Public header (logged out)
Left to right, 72 px tall, `--card` background, 1 px bottom line:
1. **Logo** (wordmark in Barlow Condensed 700) linking to `/`.
2. **City selector** (a pill showing the current city, or "All cities"): opens a searchable list. For visitors it only changes the browsing filter and is remembered in a cookie.
3. **Links:** Tournaments, How it works, Pricing.
4. Right side: **Log in** (text button) and **Sign up** (primary button).
5. On mobile: logo, city pill, and a hamburger that opens a full-height drawer with the same links.

### 6.2 App header (logged in)
1. Logo.
2. **City selector.** For a logged-in user this is their **profile city** (the city that controls where they can apply). Changing it shows a short confirm dialog: "Switch to Bhilai? You'll be able to apply to tournaments in Bhilai. Your existing registrations stay as they are."
3. **Role switcher:** a dropdown "Viewing as: Player / Manager / Organizer" (only roles the user has). Switching changes the sidebar and lands on that workspace's home.
4. **Search** (tournaments, teams, players by name).
5. **Notifications bell** with unread count; opens a 360 px popover with the latest 10 and a "View all" link.
6. **Avatar menu:** Profile, Settings, Subscription, Admin (only for admins), Log out.

### 6.3 Live strip
Sits directly under the header when any auction or match is live **in the user's city** (or anywhere for admins). Described in 5.5. Dismissible per session.

### 6.4 Workspace sidebar (desktop) / bottom bar (mobile)
| Role view | Sidebar items |
|---|---|
| **Player** | Overview, My applications, My tournaments, My stats, Subscription |
| **Manager** | My teams, Auction room, Fixtures |
| **Organizer** | Overview, Tournaments, Create tournament |
| **Admin** | Dashboard, Users, Tournaments, Payments, Subscriptions, Refunds, Reports, Cities, Sports, Pricing, Audit log, Settings |

On mobile the bottom bar shows the first four items plus a "More" sheet.

### 6.5 Footer
Four columns: Product (Tournaments, How it works, Pricing), Company (About, Contact), Support (FAQ, Refund policy), Legal (Terms, Privacy). Bottom row: copyright and a language switcher if more than one language is enabled.

### 6.6 Breadcrumbs
Shown inside workspaces below the header, e.g. `Organizer / Tournaments / Raipur Premier League / Auction`. The last crumb is plain text; others are links.

---

## 7. Site map and page count

**Total: 59 distinct pages (route templates).** Several pages have tabs (for example a tournament has 8 tabs), so the number of *screens* a user can reach is higher than 59. System pages are included in the count.

| Group | Count | Phase |
|---|---|---|
| A. Public marketing and city pages | 10 | 1 |
| B. Public tournament, team, match, player, live room pages | 6 | 1 (live room in 2) |
| C. Auth and onboarding | 5 | 1 |
| D. Account pages | 6 | 1 |
| E. Player workspace | 3 | 1 (stats in 3) |
| F. Manager workspace | 3 | 1 (auction hub in 2) |
| G. Application pages | 2 | 1 |
| H. Organizer workspace | 7 | 1 (auction console in 2, results in 3) |
| I. Admin panel | 14 | 1 minimal, rest in 3 |
| J. System pages | 3 | 1 |
| **Total** | **59** | |

### 7.1 Complete route list
| ID | Route | Page | Access |
|---|---|---|---|
| A1 | `/` | Landing | Public |
| A2 | `/how-it-works` | How it works | Public |
| A3 | `/pricing` | Pricing | Public |
| A4 | `/about` | About | Public |
| A5 | `/contact` | Contact | Public |
| A6 | `/faq` | FAQ | Public |
| A7 | `/terms` | Terms of service | Public |
| A8 | `/privacy` | Privacy policy | Public |
| A9 | `/refund-policy` | Refund policy | Public |
| A10 | `/cities/[city]` | City landing page | Public |
| B1 | `/tournaments` | Browse tournaments | Public |
| B2 | `/tournaments/[slug]` | Tournament page (tabs) | Public |
| B3 | `/tournaments/[slug]/teams/[team]` | Team page | Public |
| B4 | `/tournaments/[slug]/matches/[id]` | Match page | Public |
| B5 | `/tournaments/[slug]/auction/live` | Live auction room | Public watch, managers bid |
| B6 | `/players/[username]` | Player public profile | Public |
| C1 | `/login` | Log in | Logged out |
| C2 | `/signup` | Sign up | Logged out |
| C3 | `/auth/check-email` | Check your email | Logged out |
| C4 | `/auth/callback` | Signing you in (transient) | Logged out |
| C5 | `/onboarding` | Onboarding (city, profile) | Logged in, incomplete profile |
| D1 | `/dashboard` | Role-aware dashboard | Logged in |
| D2 | `/profile` | Edit profile | Logged in |
| D3 | `/settings` | Account settings | Logged in |
| D4 | `/subscription` | Player subscription | Logged in |
| D5 | `/notifications` | All notifications | Logged in |
| D6 | `/join/[code]` | Accept manager invite | Logged in |
| E1 | `/player/applications` | My applications | Player |
| E2 | `/player/tournaments` | My tournaments and teams | Player |
| E3 | `/player/stats` | My stats | Player |
| F1 | `/manager/teams` | My teams | Manager |
| F2 | `/manager/teams/[teamId]` | Team workspace (tabs) | Manager of that team |
| F3 | `/manager/teams/[teamId]/auction` | Auction preparation hub | Manager of that team |
| G1 | `/tournaments/[slug]/apply-player` | Apply as a player | Player (rules apply) |
| G2 | `/tournaments/[slug]/apply-team` | Apply with a team | Logged in |
| H1 | `/organizer` | Organizer overview | Organizer |
| H2 | `/organizer/tournaments` | My tournaments | Organizer |
| H3 | `/organizer/tournaments/new` | Create tournament (wizard) | Logged in |
| H4 | `/organizer/tournaments/[id]` | Tournament manager (tabs) | Owner |
| H5 | `/organizer/tournaments/[id]/checkout` | Pay tournament fee | Owner |
| H6 | `/organizer/tournaments/[id]/auction/console` | Auctioneer console | Owner |
| H7 | `/organizer/tournaments/[id]/matches/[matchId]/result` | Enter result and stats | Owner |
| I1 | `/admin` | Admin dashboard | Admin |
| I2 | `/admin/users` | Users | Admin |
| I3 | `/admin/users/[id]` | User detail | Admin |
| I4 | `/admin/tournaments` | Tournaments | Admin |
| I5 | `/admin/tournaments/[id]` | Tournament detail | Admin |
| I6 | `/admin/payments` | Organizer fee payments | Admin |
| I7 | `/admin/subscriptions` | Player subscriptions | Admin |
| I8 | `/admin/refunds` | Refunds | Admin |
| I9 | `/admin/reports` | Reports and moderation | Admin |
| I10 | `/admin/cities` | Cities | Admin |
| I11 | `/admin/sports` | Sports and rules | Admin |
| I12 | `/admin/pricing` | Pricing configuration | Admin |
| I13 | `/admin/audit-log` | Audit log | Admin |
| I14 | `/admin/settings` | Platform settings | Admin |
| J1 | `/404` | Not found | Any |
| J2 | `/500` | Something went wrong | Any |
| J3 | `/maintenance` | Down for maintenance | Any |

### 7.2 The tournament page tabs (B2)
`/tournaments/[slug]` has these tabs, each a sub-route so each can be linked and shared:
`/` Overview, `/teams`, `/fixtures`, `/standings`, `/stats`, `/auction`, `/chat`, `/rules`.

### 7.3 The tournament manager tabs (H4)
`/organizer/tournaments/[id]` has these tabs: Overview, Setup, Teams, Applications, Player pool, Auction, Fixtures, Results, Chat, Announcements, Plan and payment, Settings.

### 7.4 The team workspace tabs (F2)
Overview, Squad, Invites, Fixtures, Team profile.

---

## 8. Public pages (spec)

For every page below: **Layout** = top to bottom sections. **States** = loading, empty, error. All pages include the global header and footer from section 6.

### A1. Landing page `/`
**Purpose:** Explain the product in 10 seconds and send organizers and players to sign up.

**Layout**
1. **Hero (full width, 640 px tall on desktop).**
   - Left half: H1 "Run your local tournament like the big league." Subtext (Body L): "Create a tournament, auction your players, schedule matches, and track every score. Cricket and football, in your city." Two buttons: **Create a tournament** (primary) and **Find a tournament** (secondary).
   - Right half (the one bold element): a live **scoreboard card** showing a sample match: two team names in Barlow Condensed, scores counting up once on load, an over/minute indicator, and a Floodlight "Live" badge. Beneath it, a small sample auction strip: "Lot 14: Arjun Sahu, bid 120 points".
   - Below the hero on mobile, the scoreboard moves under the buttons.
2. **City strip:** "Happening in [selected city]" (if a city is selected) with 3 tournament cards; else "Popular cities" chips linking to city pages.
3. **Three ways to use it** (3 columns, not numbered, not a sequence): *Organize* (create a tournament in minutes), *Manage a team* (build your squad, bid in the auction), *Play* (apply to auctions in your city, build your stats). Each has one line of copy and a link.
4. **The auction section:** a wide mock of the live auction room (screenshot or live component) with copy: "Run a real auction. Managers bid from their phones. You press Sold."
5. **From fixtures to standings:** short row of three product visuals: fixture ticket, match result form, standings table.
6. **For organizers (callout):** "Set up once, run every season." Button: Create a tournament.
7. **FAQ preview:** 5 questions with a link to `/faq`.
8. **Final call to action** band: "Your next tournament starts here." Sign up button.

**States:** Tournament cards show skeletons while loading. If the city has no tournaments: "No tournaments in [city] yet. Be the first to create one." with a Create button.

### A2. How it works `/how-it-works`
**Layout**
1. Title and one-sentence intro.
2. **Tabs: For organizers | For managers | For players.** Each tab is a true step-by-step process (these *are* sequences, so numbering is appropriate):
   - Organizers: (1) Create your tournament, (2) Pay the tournament fee and publish, (3) Invite or accept teams, (4) Fill squads by auction or directly, (5) Publish fixtures, (6) Enter results and stats.
   - Managers: (1) Accept your invite or apply, (2) Set up your team, (3) Join the auction or add players, (4) Follow your fixtures.
   - Players: (1) Sign up and pick your city, (2) Start your subscription, (3) Apply to an auction or tournament, (4) See which team picks you, (5) Build your stats.
3. A short note box: "Money between players, teams, and organizers is handled by you outside the app. Auction points are virtual."
4. CTA.

### A3. Pricing `/pricing`
**Layout**
1. Title: "Simple pricing" and intro.
2. **Two cards side by side:**
   - *For organizers:* a table of team-count tiers with the fee for each (values loaded from Admin > Pricing). Row examples: "3 to 4 teams", "5 to 6 teams", "7 to 8 teams". Note: "Paid once per tournament."
   - *For players:* the monthly plan price (from Admin > Pricing) with a short list: "Apply to any auction or tournament in your city", "Public player profile and stats", "Cancel any time. Existing registrations stay valid."
3. **What is free:** browsing every tournament, following results, watching live auctions, chat in tournaments you belong to.
4. FAQ about billing.
5. CTA buttons: Create a tournament, Start playing.

**States:** If pricing fails to load, show "Pricing is unavailable right now. Please try again." and do not show stale numbers.

### A4. About `/about`
Mission statement, the story of the product, how it started (written by the owner), contact link. One image area (founder or team) optional.

### A5. Contact `/contact`
Form: Name, Email, Topic (dropdown: Support, Payment issue, Report a tournament, Partnership, Other), Message (max 2000 chars). Submit button: **Send message**. Success: "Message sent. We reply within 2 working days." Messages are saved to the database and emailed to the admin. Spam protection: honeypot field plus rate limit (5 per hour per IP).

### A6. FAQ `/faq`
Accordion grouped by: Getting started, Organizers, Managers, Players, Auctions, Billing. A search box filters questions as you type. Content is editable from Admin > Settings.

### A7, A8, A9. Terms, Privacy, Refund policy
Long-form text pages with a sticky table of contents on desktop, "Last updated" date at the top, and a version number. **The Terms page must state clearly** that the platform does not take part in money exchanged between users, and that auction points are virtual.

### A10. City page `/cities/[city]`
**Purpose:** SEO landing page and a friendly local view.
**Layout:** City name H1; stats row (tournaments running, teams, players); filters (sport, status); tournaments grid; "Create a tournament in [city]" callout; upcoming auctions list. If the city is not active in Admin > Cities, show 404.

### B1. Browse tournaments `/tournaments`
**Layout**
1. Title "Tournaments".
2. **Filter bar** (sticky): Sport (All, Cricket, Football), City (All cities by default, searchable), Status (All, Open for registration, Auction soon, Live, Completed), Squad mode (All, Auction, Direct), Date range, Search by name. A "Clear filters" link.
3. **Tournament grid** (3 columns desktop, 2 tablet, 1 mobile). Each **tournament card**:
   - 3 px top edge in the sport color, sport icon.
   - Banner image (16:9) or generated pattern fallback.
   - Name (H3), city, dates.
   - Badges: status, squad mode.
   - Line: "6 of 8 teams joined" with a thin progress bar.
   - Footer: organizer name and avatar; a "View" link.
4. Pagination (12 per page) with "Load more" on mobile.
5. Ordering: Live first, then starting soonest, then newest.

**Rules:** Browsing is global; the city filter does **not** limit what a user can see. On each card the viewer who is a player in another city sees a small label "Applications limited to [City] players" only on the tournament page, not on the card.

**States:** Empty: "No tournaments match these filters." + Clear filters button. Error: "Couldn't load tournaments. Try again." + Retry.

### B2. Tournament page `/tournaments/[slug]`
**Header block (always visible above tabs)**
- Banner image full width (240 px tall desktop).
- Overlapping logo (96 px) at left.
- Name (H1), badges (sport, status, squad mode, format), city, dates, venue name.
- Organizer chip (avatar + name) linking to their public info.
- **Primary action area** (changes with state and viewer):
  | Situation | Button shown |
  |---|---|
  | Registration open, viewer is player in same city with subscription | **Apply as a player** |
  | Same, but no active subscription | **Start subscription to apply** (links to `/subscription`) |
  | Viewer's profile city differs | A disabled button "Applications are limited to [City] players" with a link "Switch city" |
  | Open tournament accepting team applications | **Apply with a team** |
  | Auction is live | **Watch the live auction** (Floodlight accent) |
  | Viewer is the organizer | **Manage tournament** |
  | Viewer is a manager of a team in it | **Go to my team** |
  | Logged out | **Log in to apply** |
- Share button (copy link, WhatsApp, native share).

**Tabs**
1. **Overview:** About text; key facts grid (sport, format, teams, players per team, matches, overs/duration, start and end date, registration deadline, squad mode); prize section (prize description, with 1st/2nd/3rd if set); venue with map link; organizer contact (only if the organizer chose to show it); announcements feed; "Teams so far" row of logos.
2. **Teams:** Grid of team cards (logo, name, manager name, squad size "9 of 11"). Click opens B3. If the tournament is open for team applications, a "Join with your team" card appears.
3. **Fixtures:** Grouped by round/date. Each row is a **fixture ticket**: teams (logos + names), date, time, venue/ground, status badge, score when complete. Filter by team. Live matches float to the top with Floodlight badge. Before fixtures exist: "Fixtures will appear once registration closes."
4. **Standings:** Table per format (see section 16). Columns for cricket: Pos, Team, P, W, L, T, NR, Pts, NRR. Football: Pos, Team, P, W, D, L, GF, GA, GD, Pts. Top 4 (or qualifying places) tinted subtly with a legend. For knockout format: a bracket graphic instead of a table. For league + playoffs: table then a playoff bracket.
5. **Stats:** Leaderboards. Cricket: Most runs, Most wickets, Highest score, Best bowling, Most sixes, Best strike rate (min balls). Football: Top scorers, Most assists, Yellow cards, Red cards, Clean sheets. Top 10 each, with "View all" modal.
6. **Auction:** Shows state: *Not scheduled*, *Scheduled for [date, time]* with countdown, *Live now* with Watch button, *Completed* with a results table (player, team, price in points, sold/unsold). For direct squad mode this tab is hidden.
7. **Chat:** Visible to members; non-members see "Join this tournament to chat" with a read-only preview of the pinned announcement.
8. **Rules:** The organizer's rules text, plus the structured rules (match format, points system, tie-breakers, substitution rules).

**States:** Tournament in draft is not visible (404 for non-owners). Cancelled shows a red banner "This tournament was cancelled" with the organizer's reason.

### B3. Team page `/tournaments/[slug]/teams/[team]`
**Layout:** Header (logo, team name, tournament link, manager name, team colors); tabs or sections: **Squad** (player cards: avatar, name, role/position, price in points if auctioned), **Fixtures and results** for that team, **Team stats** (matches, wins, top performers). Squad shows "Squad not finalised" until locked.

### B4. Match page `/tournaments/[slug]/matches/[id]`
**Layout**
1. Scoreboard header: team A vs team B, big numerals (cricket: `156/4 (18.2)` style; football: `2 - 1`), status badge, date/time/venue.
2. **Result line:** "Falcons won by 5 wickets" or "Lions won 2 - 1".
3. **Scorecard tabs:** cricket: Batting and Bowling per innings; football: Lineups, Goals, Cards.
4. **Player of the match** card.
5. **Match notes** by the organizer (optional text).
6. Before the match: only teams, date, venue, head-to-head count if any.

### B5. Live auction room `/tournaments/[slug]/auction/live`
Specified fully in section 17.

### B6. Player public profile `/players/[username]`
**Layout:** Avatar, name, username, city, sports badges; **Bio**; **Playing details** per sport (cricket: batting hand, bowling style, role; football: position, preferred foot); **Career stats** summary per sport; **Tournament history** list (tournament, team, price if auctioned, stats); share button. A visitor sees only fields the player marked public (phone and date of birth are never public). A "Report profile" link in a kebab menu.

---

## 9. Auth and onboarding pages (spec)

### C1. Log in `/login`
**Layout:** Centered card, 440 px wide, on the Chalk background with a faint pitch-line pattern behind it (thin white lines forming a field outline, 6% opacity).
1. H2 "Welcome back".
2. Button: **Continue with Google** (white button, Google logo).
3. Divider "or".
4. Email input + button **Email me a sign-in link**.
5. Small text: "New here? **Create an account**".
6. Footer text: "By continuing you agree to the Terms and Privacy Policy" (links).

**Behaviour**
- Google: redirects to Google and returns to `/auth/callback`.
- Email: sends a magic link and a 6-digit code; the user goes to C3.
- If `?next=/some/path` exists, the user returns there after login.
- Logged-in users visiting `/login` are redirected to `/dashboard`.

**Errors:** Invalid email format: "Enter a valid email address." Too many requests: "Too many attempts. Try again in a few minutes." Provider failure: "Couldn't sign you in. Try again or use email."

### C2. Sign up `/signup`
Same card and fields as login; the heading is "Create your account". Under the buttons: "You'll pick your city and set up your profile next." A checkbox is **not** needed (agreement by continuing), but the Terms and Privacy links must be visible. New accounts always go to `/onboarding` after the first sign-in.

### C3. Check your email `/auth/check-email`
**Layout:** Mail icon, H2 "Check your email", text "We sent a sign-in link to **name@example.com**. It expires in 15 minutes." A 6-box code entry ("Or enter the 6-digit code"). Buttons: **Resend link** (disabled for 60 seconds with a countdown), **Use a different email**. Success: redirect to `/auth/callback`.

### C4. Signing you in `/auth/callback`
Transient page: spinner and "Signing you in...". Exchanges the auth code for a session, then sends the user to `/onboarding` if the profile is incomplete, else to `next` or `/dashboard`. On failure: "That link has expired or was already used." with a button **Request a new link**.

### C5. Onboarding `/onboarding`
A 3-step wizard with a slim progress bar at the top (steps are a true sequence). The user can't skip steps 1 and 2; step 3 is skippable.

**Step 1: Your city**
- H2 "Which city do you play in?"
- Searchable list of **active cities** (from Admin > Cities), with a "Detect my location" button that suggests the nearest active city (asks browser permission; never required).
- Helper text: "You can browse tournaments everywhere, but you can only apply in your city. You can change this later."
- If the user's city is not listed: link "My city isn't listed" opens a small form (city name + email) saved as a request.
- Button: **Continue**.

**Step 2: About you**
- Full name (required, 2 to 60 chars).
- Username (required, 3 to 20 chars, lowercase letters, numbers, underscore; checked live for availability).
- Profile photo (optional, JPG/PNG/WebP up to 5 MB, cropped square).
- Phone number (optional but recommended; used for contact between participants, **not verified in v1**; shown only to organizers/managers when needed **[OPEN]**).
- Date of birth (required; users under 13 can't sign up; under 18 see a note that parental consent is needed per Terms **[OPEN: legal review]**).
- Button: **Continue**.

**Step 3: What do you want to do first?**
- Three large selectable cards (multi-select allowed): **Play** (create player profile), **Manage a team**, **Organize tournaments**. This only decides what the dashboard emphasizes; roles can be added at any time.
- If Play is chosen, ask sports (Cricket, Football) and a short sport profile (cricket: role, batting hand, bowling style; football: position, preferred foot). All optional.
- Buttons: **Finish** and "Skip for now".

**After finishing:** go to `/dashboard` with a welcome toast "You're all set, [first name]."

---

## 10. Account pages (spec)

### D1. Dashboard `/dashboard`
A role-aware home. The top shows a greeting ("Good evening, Rahul") and the active role.

**Player view**
- **Subscription card:** status (Active until 12 Dec / Not subscribed) with the button **Start subscription** or **Manage**.
- **Open in your city:** up to 6 tournaments accepting player applications in the user's city, with an **Apply** button on each.
- **My applications** summary: counts of Pending / Approved / Rejected, link to E1.
- **Upcoming matches** for teams the player belongs to.
- **Live now** strip if relevant.

**Manager view**
- Cards for each team: team name, tournament, squad size vs required, next fixture, auction status. Button **Open team**.
- **Auction countdown** if any team's auction is scheduled within 7 days.

**Organizer view**
- Row of 4 stat tiles (Active tournaments, Teams joined, Pending player applications, Matches this week).
- **Needs your attention** list (e.g. "Pay the tournament fee to publish Raipur Premier League", "12 players waiting for approval", "Enter result for Falcons vs Lions").
- Button **Create tournament**.

**Empty state (brand new user):** three big cards (Find a tournament, Create a tournament, Join a team with an invite code) and an input "Have an invite code?".

### D2. Profile `/profile`
**Layout:** Left column: photo uploader and live preview of the public card. Right column: forms in sections.
1. **Basic:** name, username, bio (max 240 chars), city (opens the city change dialog), phone, date of birth (read-only after onboarding except by support).
2. **Sport profiles:** a tab per sport (Cricket, Football). Cricket fields: role (Batter, Bowler, All-rounder, Wicket-keeper), batting hand, bowling style (Right-arm fast, Right-arm medium, Right-arm off spin, Left-arm orthodox, etc.), jersey number preference. Football fields: position (GK, DEF, MID, FWD), preferred foot, jersey number preference. Height and weight optional.
3. **Visibility:** toggles for what shows publicly (age, city, stats). Phone is never public.
4. **Save changes** sticky bar appears when the form is changed ("You have unsaved changes": Save changes / Discard).

### D3. Settings `/settings`
Sections in a left list (accordion on mobile):
1. **Account:** email (read-only), connected sign-in methods (Google), **Log out of all devices**.
2. **City:** current city, change button.
3. **Notifications:** per category toggles for in-app and email: Tournament updates, Auction alerts, Application status, Match reminders, Chat mentions, Billing. Quiet hours not in v1.
4. **Appearance:** theme (System, Light, Dark), language **[OPEN]**.
5. **Privacy and data:** download my data (JSON export), **Delete my account** (confirm dialog explaining that organizer tournaments must be transferred or completed first and that match history stays anonymized as "Former player").
6. **Danger zone:** delete account only.

### D4. Subscription `/subscription`
Specified in section 20 (Payment flows).

### D5. Notifications `/notifications`
List grouped by Today / Earlier. Each item: icon by category, one-line text, time, unread dot. Click opens the relevant page and marks read. Top actions: **Mark all as read**, filter tabs (All, Unread). Empty: "You're all caught up."

### D6. Accept invite `/join/[code]`
**Purpose:** The organizer sends a manager invite as a link or code. This page handles it.
**Layout (card):** Tournament banner strip; "You've been invited to manage **Falcons** in **Raipur Premier League**"; invited by organizer name; team logo and name; summary facts (sport, dates, squad size, auction date). Buttons: **Accept and manage team** (primary), **Decline** (secondary).
**Rules:**
- If logged out: show "Log in to accept" and keep the code through login.
- If the code is invalid, expired, or already used: error state "This invite isn't valid anymore. Ask the organizer for a new one." No team details are shown for invalid codes.
- If the user is already the manager of another team in the same tournament, block with an explanation (one manager per team; one team per manager per tournament).
- Accepting adds the Manager role to the user and redirects to `/manager/teams/[teamId]`.

---

## 11. Player workspace and application pages (spec)

### E1. My applications `/player/applications`
**Layout:** Tabs: All, Pending, Approved, Rejected, Withdrawn. Table (cards on mobile): Tournament (banner thumbnail + name), City, Sport, Squad mode, Applied on, Status badge, Next step.
- **Pending:** "Waiting for the organizer." Action: **Withdraw**.
- **Approved (auction mode):** "In the auction pool. Auction on 14 Dec, 6 pm." Action: **Watch auction**.
- **Approved (direct mode):** "Approved. Waiting to be added to a team."
- **Picked:** "Picked by Falcons for 150 points." Action: **View team**.
- **Unsold:** "You weren't picked in the auction." (Neutral wording, no negative language.)
- **Rejected:** shows the organizer's reason if given.
**Empty:** "You haven't applied to anything yet." + **Find tournaments in [city]**.

### E2. My tournaments and teams `/player/tournaments`
Cards for every tournament the player is in as a squad member: tournament, team, role in team, next match, standings position of the team, "My stats in this tournament". Past tournaments in a collapsed "Completed" list.

### E3. My stats `/player/stats`
Sport switcher at top. Summary tiles (cricket: matches, runs, wickets, best score; football: matches, goals, assists, cards). A season/tournament table. Charts: runs per match (bar), goals per match (bar). Share button. Data comes from entered results (section 15). **Phase 3.**

### G1. Apply as a player `/tournaments/[slug]/apply-player`
**Entry checks (server side, shown as a clear blocking message if one fails, in this order):**
1. Logged in. Else go to login with `next`.
2. Tournament is published, registration open, not past its deadline, and not full (player pool cap if set).
3. **City match:** the user's profile city equals the tournament's city. Else block: "This tournament is in [City]. Your city is set to [Your city]. You can switch your city in Settings, then come back." Buttons: **Switch to [City]** (confirm dialog) and **Back**.
4. **Active subscription.** Else block: "You need an active subscription to apply." Button **Start subscription**.
5. Not already applied (else show current status).
6. Profile has the sport profile fields required by this tournament's sport (else inline prompt to complete them).

**Form layout (single page):**
- Summary box on the right (sticky): tournament name, dates, squad mode, auction date.
- Fields: **Role/position** (prefilled from profile, required), **Batting hand and bowling style** (cricket) or **Preferred foot** (football), **Experience level** (Beginner, Intermediate, Advanced), **Contact phone** (prefilled), **Availability confirmation checkbox** "I can play on the tournament dates", **Notes to organizer** (optional, 300 chars). Optional extra questions the organizer defined (see section 14).
- Checkbox: "I understand all payments between me, teams, and the organizer happen outside this platform."
- Button **Submit application**. After success: confirmation page with status Pending and a link to E1. Notification sent to the organizer.

### G2. Apply with a team `/tournaments/[slug]/apply-team`
Only for tournaments with "open team applications".
**Fields:** Team name (unique within the tournament), Team logo (optional), Team colors (2 pickers), City/area, Manager name and phone (prefilled), Expected squad size (number), Notes to organizer, checkbox for the same "payments outside this platform" statement. If the tournament requires a roster at application time, a repeater lets the manager list up to N players (name + phone) **[OPEN]**.
**After submit:** status Pending; organizer approves or rejects in the Teams tab. On approval the applicant becomes the team's manager automatically.

---

## 12. Manager workspace pages (spec)

### F1. My teams `/manager/teams`
Cards grid: logo, team name, tournament name + status, squad "9 of 11 (min 7)", next fixture, auction state. Button **Open team**. Empty: "You don't manage a team yet. Accept an invite or apply to an open tournament." with an invite code field.

### F2. Team workspace `/manager/teams/[teamId]`
**Header:** logo, team name, tournament link, status badge. Tabs:

**1. Overview**
- Summary tiles: Squad size (current vs min/max), Next match, Standing, Auction status.
- **Checklist** card: "Add team logo", "Reach minimum squad size (7)", "Confirm squad before [deadline]". Items tick automatically.
- Latest announcements from the organizer.

**2. Squad**
- Table: avatar, name, role, jersey number (editable), how added (Auction / Direct / Invite), price (points, for auction players), status (Active / Pending acceptance).
- **Direct mode:** button **Add player** opens a dialog with two options: *Search registered players* (by name or username) and *Invite by phone or link* (the player must sign up and accept). A manager adding a player does **not** require that player to have a subscription; the subscription only gates *applying*. Added players should belong to the tournament's city **[OPEN: confirm this rule applies to direct adds]**.
- **Auction mode:** the squad fills automatically as lots are sold; the manager can edit jersey numbers only. Remove/replace actions are disabled and the manager sees "Squad is set by the auction."
- Squad rules shown as a banner: "Min 7, max 11 players. 2 more needed."
- **Lock squad** button (direct mode) when the minimum is met: confirm dialog, becomes read-only (organizer can unlock).

**3. Invites** (direct mode and co-management)
- List of pending player invites with Resend / Cancel.
- **Assistant manager:** optionally invite one more person (view-only plus squad editing) **[OPEN: v2]**.

**4. Fixtures**
List of this team's fixtures and results using fixture tickets, with an **Add to calendar** link (ICS file).

**5. Team profile**
Edit team name (until registration closes), logo, colors, short description, home ground. **Save changes**.

### F3. Auction preparation hub `/manager/teams/[teamId]/auction`
**Phase 2.** Before the auction:
- **Purse card:** total points, spent, remaining, **reserve needed** (base price x remaining mandatory slots).
- **Squad requirements:** a visual grid of required roles (e.g. cricket: min 2 bowlers, 1 wicket-keeper; set by the organizer) with filled/empty slots.
- **Player pool browser:** list of approved players with filters (role, base price category, experience) and a **Watchlist** star. Starred players are highlighted in the live room.
- **Notes** field (private) per player.
- Auction date and time with countdown and **Enter auction room** (enabled 15 minutes before start).
After the auction: the same page shows the squad bought, points spent, and unsold slots.

---

## 13. Organizer workspace pages (spec)

### H1. Organizer overview `/organizer`
- Stat tiles: Active tournaments, Teams joined, Players approved, Pending applications.
- **Needs your attention** list (sorted by urgency, each with a direct button).
- **Next up:** upcoming auctions and matches across all the organizer's tournaments.
- Button **Create tournament**.
- Empty state: illustration of a whistle and "Create your first tournament. It takes about 10 minutes."

### H2. My tournaments `/organizer/tournaments`
Tabs: All, Drafts, Awaiting payment, Open, Live, Completed, Cancelled. Table: Name, Sport, City, Teams (joined/target), Status badge, Start date, Last updated, Actions (**Manage**, **Duplicate**, kebab: Share link, Delete draft). **Duplicate** copies the setup (not teams or players) into a new draft, so running the same tournament next season is quick.

### H3. Create tournament `/organizer/tournaments/new`
A multi-step wizard with a left step list (top stepper on mobile) and autosave as a draft after every step. All fields are specified in section 14. Steps:
1. Basics
2. Format and teams
3. Match rules
4. Squad and auction
5. Registration and visibility
6. Prizes and rules
7. Review and plan

The last step shows the **tier fee** for the chosen team count and the button **Save and continue to payment**. The tournament remains a **draft** until paid.

### H4. Tournament manager `/organizer/tournaments/[id]`
A header with name, status badge, and a **status stepper** showing the lifecycle: Draft, Paid, Registration open, Registration closed, Auction, Squads locked, Live, Completed. The current step is highlighted.

Tabs:

**Overview.** Key stats, a "Next step" card that always shows the single most useful action (e.g. "Open registration", "Close registration", "Schedule the auction", "Generate fixtures"), recent activity feed, public link with a copy button.

**Setup.** The same fields as the wizard, editable until certain points. Locked fields after publish: sport, squad mode, number of teams tier (you must upgrade the tier to increase teams, see section 20). Editable any time: description, banner, dates (with notification to members), venue, rules text, prizes.

**Teams.**
- Top buttons: **Add team** (creates a team slot), **Invite manager** per team (generates a link/code, copy and share button for WhatsApp), and a toggle **Accept team applications**.
- Table: team, manager, status (Invite sent, Pending approval, Approved, Rejected), squad size, actions (Approve, Reject with reason, Resend invite, Remove team).
- Rules: cannot exceed the tier's team cap; removing a team after fixtures exist requires regenerating fixtures (warning dialog).

**Applications (player applications).**
- Filter by status, role, experience; search by name.
- Row: avatar, name, role, experience, city (always equals the tournament city), applied on, notes. **Approve** / **Reject** (reject asks for an optional reason). Bulk select with **Approve selected**.
- Counter at the top: "42 applied, 30 approved, 12 pending". For auction mode a cap on pool size can be set.
- Clicking a row opens a side drawer with the full profile and past stats.

**Player pool (auction mode) / Players (direct mode).**
- Auction mode: the approved pool with **base price** and **category** per player. Bulk actions: **Set base price for selected**, **Assign category**. Ordering control for auction sequence: Random, By category, Manual (drag and drop). Button **Lock pool** (required before the auction can be scheduled).
- Direct mode: read-only list of all squad players grouped by team.

**Auction (auction mode).** Setup form (section 17.2), schedule, **Open auctioneer console** button (enabled at the scheduled time or earlier by choice), and results after completion.

**Fixtures.**
- Before generation: button **Generate fixtures** opens a dialog showing the format summary, total matches calculated, and options (seeding: Random/Manual; start date; matches per day; match times; venues/grounds list; rest days).
- After generation: list with edit controls: change date/time/venue per match, swap teams (before the match), cancel/postpone with reason. **Publish fixtures** makes them visible (a draft/published toggle).
- Warning when editing a match that already has a result.

**Results.** List of matches with status (Scheduled, Live, Completed). Button per match: **Enter result** (goes to H7). Completed matches show an **Edit result** action with an audit trail entry.

**Chat.** The tournament chat with moderation tools (section 18).

**Announcements.** Compose a post (title, body up to 1000 chars, optional pin). Posts appear on the Overview tab, in the chat as pinned messages, and send notifications to all members (email optional via a checkbox).

**Plan and payment.** Shows the chosen tier, the fee amount, payment status (Unpaid, Paid, Refunded), the invoice download, and **Upgrade plan** if more teams are needed.

**Settings.** Visibility (Public, Unlisted link-only), transfer ownership **[OPEN: v2]**, **Cancel tournament** (requires a reason; notifies all members; payment refund is subject to the Refund policy), **Delete draft**.

### H5. Checkout `/organizer/tournaments/[id]/checkout`
Specified in section 20.

### H6. Auctioneer console `/organizer/tournaments/[id]/auction/console`
Specified in section 17. **Phase 2.**

### H7. Enter result and stats `/organizer/tournaments/[id]/matches/[matchId]/result`
**Purpose:** record what happened after the match (no live scoring in v1).
**Layout:** Header with the two teams and date. Tabs for cricket innings or football sections. See section 15 for the exact fields per sport.
**Common elements:**
- **Result status:** Completed, Tied, No result, Abandoned, Walkover (with which team).
- **Winner / margin** (calculated suggestion that the organizer can override).
- **Player of the match** (searchable, only from the two squads).
- **Match notes** (optional text).
- Buttons: **Save as draft** (not public), **Publish result** (updates standings and leaderboards immediately).
- A completeness check before publishing: "Team totals don't match the sum of player entries. Check runs." The user can still publish after confirming.
**Edit after publish:** allowed for the organizer; the system recomputes standings and records an audit log entry (who, when, before/after).

---

## 14. Tournament creation form (every field)

All fields below are validated on the client (Zod) **and** on the server. Required fields are marked **(req)**.

### Step 1. Basics
| Field | Type | Rules |
|---|---|---|
| Tournament name (req) | Text | 4 to 80 chars. Used to create the slug; the slug is shown and editable until publish; unique |
| Sport (req) | Choice (Cricket, Football) | Locks after publish |
| City (req) | Searchable city list | Active cities only; defaults to the organizer's city; locks after publish |
| Venue name (req) | Text | 3 to 100 chars |
| Venue address / map link | Text / URL | Optional |
| Start date (req) | Date | Not in the past |
| End date (req) | Date | After or equal to start date |
| Banner image | Upload | 16:9, JPG/PNG/WebP, max 5 MB; crop tool |
| Logo | Upload | Square, max 2 MB |
| Short description (req) | Textarea | 20 to 240 chars (used on cards) |
| Full description | Rich text (bold, lists, links) | Up to 4000 chars |

### Step 2. Format and teams
| Field | Type | Rules |
|---|---|---|
| Tournament format (req) | Choice: League (round robin), Knockout, League then playoffs | Explains each with a mini diagram |
| Number of teams (req) | Number or dropdown | Min 3; maximum = the highest active tier (see Admin > Pricing). This choice sets the **tier fee** |
| League legs (League formats) | Choice: Single round robin, Double round robin | |
| Playoff style (League then playoffs) | Choice: Top 2 final, Top 4 semi-finals, Top 4 qualifier-style (cricket only) | |
| Teams qualifying for playoffs | Number | Derived from the playoff style |
| Third place match (Knockout, Football) | Toggle | Default off |
| Seeding method (Knockout) | Choice: Random, Manual | |
| **Total matches (read-only)** | Calculated | Updates live. Example: 6 teams double round robin = 30 league matches; shown with the breakdown |
| Matches per team (read-only) | Calculated | |

### Step 3. Match rules
Fields come from the sport configuration (section 15).

**Cricket:** Match format (T10, T20, 50 overs, Custom overs) | Overs per innings (custom) | Overs per bowler max (auto, editable) | Ball type (Tennis ball, Leather, Other) | Players per side (default 11; 6 to 11) | Powerplay (toggle) | Super over for tie (toggle) | Points for win/tie/no result (defaults 2/1/1) | Tie-breakers order (NRR, head to head, wins).

**Football:** Format (11-a-side, 9-a-side, 7-a-side, 5-a-side) | Match duration (minutes per half, default by format) | Extra time (toggle, knockout only) | Penalty shootout (toggle, knockout only) | Substitutions (Unlimited rolling, Limited N) | Points for win/draw/loss (3/1/0) | Tie-breakers (Goal difference, Goals for, Head to head, Fair play).

### Step 4. Squad and auction
| Field | Type | Rules |
|---|---|---|
| Squad mode (req) | Choice: Auction, Direct | Locks after publish |
| Squad size minimum (req) | Number | At least players per side |
| Squad size maximum (req) | Number | Not less than minimum; max 25 |
| Maximum player pool size | Number | Optional cap on approved applicants |
| **If Auction:** | | |
| Auction mode (req) | Choice: Live bidding, Simple (organizer records results) | Live is the full engine; Simple lets the organizer assign each player a team and price manually |
| Purse per team (points) (req) | Number | Same for all teams in v1 |
| Player categories | List | Defaults by sport (e.g. Batter, Bowler, All-rounder, Wicket-keeper; GK, DEF, MID, FWD) editable |
| Base price per category | Numbers | Points |
| Bid increment slabs | Table | e.g. 0 to 100 points: +5; 100 to 300: +10; 300 and above: +25 |
| Reserve rule | Toggle | Prevent bids that leave too little purse to fill the minimum squad at base prices (default on) |
| Max players per category per team | Optional numbers | |
| Auction date and time | Date-time | Can be set later |
| **If Direct:** | | |
| Squad lock deadline | Date-time | After this managers can't edit squads |
| Allow players to apply | Toggle | If on, players can apply and the organizer approves; managers can also add players directly |

### Step 5. Registration and visibility
| Field | Type | Rules |
|---|---|---|
| Team entry (req) | Choice: Invite only, Open applications, Both | Controls the Teams tab |
| Team registration deadline | Date-time | |
| Player application deadline | Date-time | |
| Custom player questions | Up to 3 short questions, each optional or required | Shown on the apply-player form |
| Visibility (req) | Public, Unlisted | Unlisted tournaments don't appear in the browse list but work by link |
| Show organizer contact | Toggle + phone/email field | |
| Entry fee info (display only) | Text | Free text like "Entry fee is collected by the organizer at the ground. The platform does not process it." No amounts are collected through the platform |

### Step 6. Prizes and rules
| Field | Type | Rules |
|---|---|---|
| Prize pool (display text) | Text | e.g. "Winners: trophy and 25,000. Runners-up: trophy." Informational only |
| Prizes per position | Repeater (position, prize text) | Up to 5 |
| Individual awards | Checklist (Player of the tournament, Best batter, Best bowler, Golden boot, Best goalkeeper, Fair play) | Appears on the tournament page |
| Rules and regulations | Rich text | Up to 6000 chars |
| Code of conduct acceptance | Checkbox (req) | "Participants must follow these rules" |

### Step 7. Review and plan
- Summary of every choice with "Edit" links back to each step.
- **Plan card:** "Your tournament has [N] teams. Tier: [5 to 6 teams]. Tournament fee: [amount from pricing, incl. tax line]." The amount comes from Admin > Pricing.
- Checkbox: "I confirm the details are correct and I accept the Terms."
- Buttons: **Save as draft** and **Continue to payment**.

**Autosave:** every step saves on "Next" and on a 10 second idle timer; the header shows "Saved 2 minutes ago".
**Validation display:** errors appear under the field and in a summary at the top of the step.
**Navigation guard:** leaving with unsaved changes asks for confirmation.

---

## 15. Sport configuration: Cricket and Football

### 15.1 How sports are stored
Each sport is a row in `sports` with a `config` JSON document defining: squad limits, match format options, positions/roles, stat fields, scoring and standings rules, and labels. The web UI reads this config to render forms (sport profile, apply form, tournament rules step, result entry). Adding a sport later means adding a config and, if its result form is unusual, one new result-entry component.

### 15.2 Cricket
**Player roles:** Batter, Bowler, All-rounder, Wicket-keeper.
**Batting hand:** Right, Left. **Bowling style:** Right-arm fast, Right-arm medium, Right-arm off spin, Right-arm leg spin, Left-arm fast, Left-arm medium, Left-arm orthodox, Left-arm wrist spin, None.

**Result entry (per match):**
- Innings 1 and 2 each: batting team, total runs, wickets, overs, extras (wides, no-balls, byes, leg byes).
- **Batting table per innings** (one row per player who batted): runs, balls, fours, sixes, dismissal type (Not out, Bowled, Caught, LBW, Run out, Stumped, Hit wicket, Retired), dismissed by (bowler, optional fielder). Strike rate is calculated.
- **Bowling table per innings:** overs, maidens, runs conceded, wickets, wides, no-balls. Economy is calculated.
- **Fielding:** catches, run-outs, stumpings (optional table).
- Toss winner and decision.
- **Result:** Won by X runs / X wickets, Tie, No result, with a super over option.
- **Calculated automatically:** team totals vs player entries check; Net Run Rate inputs (runs scored, overs faced, runs conceded, overs bowled; when all out, full quota of overs used).

**Standings:** Points (win 2, tie 1, no result 1, loss 0 by default, editable). Columns: P, W, L, T, NR, Pts, NRR. Tie-break order configurable (NRR, head to head, most wins).

**Leaderboards:** Most runs, Highest score, Most wickets, Best bowling figures, Best strike rate (min 30 balls), Best economy (min 6 overs), Most sixes, Most catches.

### 15.3 Football
**Positions:** Goalkeeper, Defender, Midfielder, Forward. **Preferred foot:** Right, Left, Both.

**Result entry (per match):**
- Full-time score (home and away), plus half-time score (optional), extra-time and penalty shootout score if applicable.
- **Lineups:** starting players for each team (from squad), substitutes used (optional).
- **Events list** (repeater): Goal (scorer, assist optional, minute, own goal flag, penalty flag), Yellow card (player, minute), Red card (player, minute, reason), Substitution (optional).
- Goalkeeper clean sheet flag (calculated from goals conceded).
- **Result:** Home win, Away win, Draw; Walkover.
- Player of the match.

**Standings:** Points (win 3, draw 1, loss 0 by default). Columns: P, W, D, L, GF, GA, GD, Pts. Tie-breaks: GD, GF, head to head, then fair play (fewest card points) and draw of lots by organizer note.

**Leaderboards:** Top scorers, Most assists, Most yellow cards, Most red cards, Most clean sheets.

### 15.4 Simplicity rule
Result entry for a match should take an organizer **under 5 minutes** for a typical match. Therefore: only a few fields are required (final score/result, winner, player of the match); the player tables are optional but strongly encouraged, with a prominent "Add stats" step after publishing the result. Leaderboards simply use whatever stats were entered.

---

## 16. Fixture formats and standings logic

### 16.1 League (round robin)
- Every team plays every other team once (single) or twice (double).
- Number of matches: `N x (N - 1) / 2` for single, double that for double.
- Scheduling: the **circle method** produces balanced rounds; for odd N a "bye" is used each round. Home/away alternation is handled for double legs. The generator never schedules a team twice in one slot and respects "max matches per day" and "rest day" options.

### 16.2 Knockout
- Single elimination bracket. If N is not a power of two, the top seeds get **byes** in round 1. Seeding random or manual.
- Bracket view is a tree graphic on the Standings tab; each match box shows teams and score; the winner advances automatically when the result is published.
- Optional third place match for football.

### 16.3 League then playoffs
- Stage 1: round robin as above. Stage 2 starts when all league matches have results (the organizer clicks **Start playoffs**; the system fills qualifying teams from the table).
- Playoff styles: **Top 2 final**; **Top 4 semi-finals** (1v4, 2v3, then final); **Qualifier style, cricket only** (Qualifier 1: 1v2; Eliminator: 3v4; Qualifier 2: loser of Q1 vs winner of Eliminator; Final).

### 16.4 Match status lifecycle
Scheduled, Live (the organizer can set this manually so the live badge shows), Completed, Postponed, Cancelled, Abandoned, Walkover.

### 16.5 Recomputing standings
Standings are **derived**, not hand-edited. They recompute from published results in a database function whenever a result is published, edited, or deleted. They are stored in a table for fast reading and rebuilt if anything is edited.

### 16.6 Edge cases
- A team withdraws mid-tournament: the organizer can mark it withdrawn; remaining matches are marked walkovers or removed (the organizer chooses a rule: keep results or void them).
- Equal points and tie-breakers unresolved: shown as tied with a note; the organizer can manually order with a note.
- Date changes notify both teams' managers and players.

---

## 17. Auction system (spec)

**Phase 2.** Applies to tournaments with squad mode = Auction and auction mode = Live bidding. The Simple mode (organizer records results manually) is a form inside the Auction tab: for each player the organizer picks a team and a price in points, and the purses update.

### 17.1 Principles
- The **organizer is the auctioneer**: they choose which player is up, open and close bidding, and press Sold.
- **Managers** place bids from their phones or laptops, only for their own team.
- **Everyone else** (players, spectators) can watch the room in read-only mode.
- All bid validation happens on the **server** in one database function; the UI only displays outcomes.
- Auction values are **virtual points**. No money moves in the auction.

### 17.2 Auction setup (in the Auction tab, before the event)
| Setting | Notes |
|---|---|
| Purse per team | From the tournament form; can be edited until the pool is locked |
| Categories, base prices | From the tournament form; per-player override allowed in the pool |
| Bid increment slabs | Table; the next bid is always `current bid + increment for the current slab` |
| Reserve rule | On by default |
| Max players per category per team | Optional |
| Sequence | Random, By category, Manual |
| Unsold players | Option to run an **unsold round** at the end (a second pass at reduced base price, set by the organizer) |
| Date and time | Notifies all members; shows countdown |
| Readiness checklist | Pool locked, every team has a manager, purses set, sequence set. The **Start auction** button stays disabled until all items are ticked |

### 17.3 Auction states
`Scheduled` > `Live` > `Paused` (any time) > `Completed`. Each **lot** (one player) goes through: `Upcoming` > `On the block` (bidding open) > `Sold` or `Unsold`.

### 17.4 Auctioneer console (H6)
Designed for a laptop or tablet in landscape; works on a phone in a compact layout.

**Layout (desktop, three columns):**
```
+------------------------+--------------------------------------+---------------------+
| LOT QUEUE              | ON THE BLOCK                         | TEAMS               |
| search, filter         |  [photo]  Arjun Sahu                 | Falcons  420 / 500  |
| Upcoming (46)          |  All-rounder, right-hand, off spin   |  7/11  [leading]    |
| Sold (13)              |  Base price 20 points                | Lions    310 / 500  |
| Unsold (1)             |  CURRENT BID      120                | ...                 |
|                        |  held by Falcons                     | purse bars          |
|  drag to reorder       |  [ Open bidding ] [ Going once ]     |                     |
|                        |  [ Going twice ] [ SOLD ] [ Unsold ] |                     |
|                        |  [ Undo last bid ]                   |                     |
|                        | ------------------------------------ |                     |
|                        |  BID HISTORY (live list)             |                     |
+------------------------+--------------------------------------+---------------------+
 Top bar: Auction status (Live), Pause, End auction, Connected managers (7 of 8 online)
```

**Controls and rules**
| Control | What it does |
|---|---|
| **Select player** (click in the queue) | Puts that player on the block (state: Upcoming > On the block, bidding closed) |
| **Open bidding** | Starts accepting bids from managers |
| **Going once / Going twice** | Display-only prompts shown to all viewers (Clay color pulse). Optional |
| **SOLD** | Enabled only if at least one valid bid exists. Assigns the player to the highest bidder, deducts the price from the purse, adds the player to the squad, and shows the "Sold" stamp animation to everyone |
| **Unsold** | Marks the lot unsold; the player goes to the unsold list |
| **Undo last bid** | Removes the most recent bid with a required reason; logged in the audit trail |
| **Pause / Resume** | Stops bids and shows "Auction paused" to everyone |
| **Reorder queue** | Drag and drop upcoming lots |
| **Edit player base price** | For the lot on the block before bidding opens |
| **End auction** | Confirm dialog. Remaining upcoming players are marked unsold. Sends results to all members |

The console shows each team's **purse, squad count, and whether they can still bid** (green dot / grey dot), and a connection indicator for each manager (online/offline).

### 17.5 Live room for managers and spectators (B5)
**Mobile layout (vertical):**
1. Top bar: tournament name, "Live" Floodlight badge, viewers count.
2. **Player card** (photo, name, role, details, base price).
3. **Current bid** in the largest Barlow Condensed numerals on the page with "held by [Team]" below. When a new bid arrives the number slides up and flashes.
4. **Bid button** (managers only): big full-width button labeled `Bid 125` (the next valid amount). States: Enabled, Disabled with reason text below it: "Bidding is closed", "You're the highest bidder", "Not enough purse", "Squad is full", "Auction paused".
5. **My team strip:** purse remaining, squad count, reserve needed.
6. **Bid history** (last 8, newest on top).
7. Tabs: **Teams** (purse table for all teams), **Sold** (recent sales), **Upcoming**.
Desktop expands this into two columns.

**Spectators and players:** the bid button area is replaced by "Watching live". Players who are in the pool see a highlight when their own lot comes up: "You're up".

### 17.6 Bid validation (server)
A bid is accepted only if **all** are true (checked inside a transaction with a row lock on the lot):
1. Auction is Live (not Paused) and the lot is open for bidding.
2. Bidder is the manager of a team in this tournament and that team is active.
3. Bid amount equals `current bid + valid increment` (or base price for the first bid); no custom amounts in v1.
4. Team is not already the highest bidder (no self-outbid).
5. Team purse remaining is at least the bid.
6. **Reserve rule:** `purse - bid >= base price x (minimum squad size - players owned - 1)`, clamped to zero, so the team can still fill the minimum squad.
7. Team squad is below the maximum and the category limit (if any) is not exceeded.
Concurrent bids: the first to commit wins; the other manager sees "Someone bid first. The current bid is 130." and the button updates instantly.

### 17.7 Realtime design
- Channel per tournament: `auction:{tournamentId}`.
- Events (broadcast): `lot_opened`, `bid_placed`, `bid_undone`, `going_once`, `going_twice`, `lot_sold`, `lot_unsold`, `auction_paused`, `auction_resumed`, `auction_ended`, `queue_updated`.
- The **database is the source of truth**; events carry the new state, and clients re-sync from the database on reconnect.
- Presence tracks which managers are online.
- If the connection drops: banner "Reconnecting..." and the bid button is disabled until re-synced.

### 17.8 After the auction
- Results table on the tournament Auction tab: player, role, team, price, sold/unsold.
- Teams' squads are filled; the organizer can lock squads. Unsold players are listed so the organizer or managers can arrange to add them in direct fashion if the organizer allows.
- A **CSV export** of results for the organizer.

---

## 18. Chat (spec)

**Phase 2.** One group chat per tournament.

### 18.1 Who can do what
| Person | Read | Write | Moderate |
|---|---|---|---|
| Organizer | Yes | Yes | Yes |
| Managers of the tournament | Yes | Yes | No |
| Players with approved application or squad spot | Yes | Yes | No |
| Other logged-in users | Pinned message only | No | No |
| Admin | Yes | Yes (flagged "Admin") | Yes |

### 18.2 Layout
- Header: tournament name, members count, pinned announcement bar (collapsible).
- Message list: avatar, name, role badge (Organizer, Manager, Player), time, message text. Own messages align right with a tinted background. Date separators ("Today"). Auto scroll to newest unless the user scrolled up, in which case a "New messages" pill appears.
- Composer: text input (max 500 chars) with Enter to send, emoji picker, character counter near the limit. **Text only in v1** (no images or files).
- Mentions: typing `@` opens a members list; mentioned users get a notification.

### 18.3 Moderation
- Organizer and admin can **delete a message**, **mute a user** (for 1 hour, 1 day, or the rest of the tournament), and **pin/unpin** a message.
- Any member can **report** a message (reason dropdown). Reports go to Admin > Reports and the organizer.
- Slow mode: one message per 3 seconds per user.
- Basic filter for links from newly joined users is **[OPEN]**.

### 18.4 States
Empty: "No messages yet. Say hello to the other teams." Muted user: composer replaced with "You're muted until [time]." Tournament completed: chat becomes read-only after 30 days **[OPEN]**.

---

## 19. Notifications (spec)

### 19.1 Channels
In-app (bell + page) and email in v1. Web push is a later addition.

### 19.2 Events
| Recipient | Event |
|---|---|
| Organizer | Fee payment confirmed / failed; new team application; new player application; manager accepted invite; squad locked by a team; auction readiness reminder (1 day before); match result missing (24 h after match time); chat report received |
| Manager | Invite received; team application approved/rejected; auction scheduled / starts in 15 min / live now; player added to squad; squad lock reminder; fixture published or changed; match reminder (1 day and 2 hours before) |
| Player | Application approved/rejected; added to a team; picked or unsold in the auction; fixture and match reminders for their team; subscription renewal reminder (3 days before); subscription payment failed |
| Admin | New report; refund request; payment failure spike; new city request |

### 19.3 Rules
- Users control categories in Settings. Billing and security notices cannot be turned off.
- Notifications are deduplicated (one per event per user) and batched when many arrive within a minute (e.g. "5 new player applications").
- Every email has a clear subject line with the tournament name and a single main button.

---

## 20. Payment flows (product level)

The platform charges only two things, both through Razorpay. **No amounts are fixed in this document**; they come from Admin > Pricing and are shown with tax lines as applicable. Entry fees between players, teams and the organizer are **not** handled by the platform.

### 20.1 Organizer: tournament fee (one-time order)
**When:** after the organizer completes the creation wizard, before the tournament can be published.

**Checkout page (H5) layout:**
- Left: order summary card: tournament name, sport, city, "[N] teams (tier [X to Y teams])", fee amount, tax line, total.
- Right: payment panel: **Pay [total]** button that opens the Razorpay checkout modal (UPI, cards, netbanking, wallets as enabled in Razorpay).
- Below: "Your tournament goes live right after payment" and a link to the Refund policy.
- Back link: "Edit tournament".

**Flow**
1. Organizer clicks **Pay**. The server creates a Razorpay order with the amount taken from the pricing table (never from the browser) and stores a `tournament_payments` row with status `created`.
2. Razorpay modal opens and the user pays.
3. The browser receives a success callback and shows "Confirming payment..." (spinner). **The result is trusted only after the Razorpay webhook** (`payment.captured`) arrives; the page polls the payment status every 2 seconds for up to 60 seconds.
4. On confirmation: payment status `paid`, tournament status moves Draft to **Paid** and then the organizer can click **Publish**. The invoice/receipt is generated (PDF) and emailed; downloadable from the Plan and payment tab.
5. Failure: "Payment didn't go through. You haven't been charged." with **Try again**. If money was debited but confirmation is delayed: "We're confirming your payment. This can take a few minutes. You don't need to pay again."

**Upgrading the tier** (more teams later): the organizer picks a higher team count; the system charges the **difference** between the tiers (calculated server side). Locked until paid.

**Cancellations and refunds:** governed by the Refund policy page; refunds are initiated by Admin (Admin > Refunds) and executed through Razorpay; the tournament payment row becomes `refunded` and the organizer is notified.

### 20.2 Player: monthly subscription (D4)
**Page layout `/subscription`:**
1. **Status card** (top):
   - *Not subscribed:* "Subscribe to apply to auctions and tournaments." Plan name, price per month, benefits list, **Start subscription** button.
   - *Active:* "Active. Renews on 12 Dec." Plan, amount, payment method (e.g. UPI AutoPay or card ending 4242), **Cancel subscription**.
   - *Cancelled but active until period end:* "Ends on 12 Dec. You won't be charged again." **Resume subscription**.
   - *Payment failed (past due):* Clay banner "We couldn't take your payment. Update your payment method." **Fix payment**. (Grace behaviour is configured in Admin > Pricing **[OPEN]**.)
   - *Expired:* "Your subscription ended. Existing registrations stay valid. Start again to apply to new tournaments."
2. **What it covers:** a short list: apply to any auction or tournament in your city, public profile and stats. Browsing and following remain free.
3. **Billing history table:** date, description, amount, status (Paid/Failed/Refunded), **Download receipt**.
4. **FAQ** with 4 questions (cancel any time, what happens to existing registrations, how to change payment method, refunds).

**Flow**
1. **Start subscription** creates a Razorpay Subscription for the active plan and opens the Razorpay authorization flow (UPI AutoPay or card mandate).
2. Webhooks (`subscription.activated`, `subscription.charged`, `subscription.halted`, `subscription.cancelled`, `payment.failed`) update the `subscriptions` table; the UI never marks a subscription active by itself.
3. A subscription is "active" for gating when its status is `active` (or within the allowed period after `cancelled` until the paid period ends).

### 20.3 The gate (what the subscription controls)
- **Required:** applying as a player to any auction or tournament (G1), and being added to an auction pool.
- **Not required:** browsing, watching the live auction, chat in tournaments the user already belongs to, editing the profile.
- **Existing registrations are never removed** when a subscription lapses. The check happens **only when a new application is submitted**, inside the database function `apply_as_player` (so it cannot be bypassed).
- Pages show the right message and the right button at each step (see G1 entry checks and B2 action area).

### 20.4 Security and reliability rules
- Amounts are always computed on the server from the pricing tables.
- Webhook endpoints verify Razorpay's signature; events are idempotent (the same event received twice changes nothing).
- All payment statuses shown to users come from the database, not from client-side callbacks.
- Payment IDs are stored for reconciliation; card/UPI details are never stored by us.
- Every pricing change creates a new version; existing paid orders keep their original amount.

---

## 21. Admin panel pages (spec)

The admin panel is part of the same Next.js app at `/admin`, visible only to users flagged as admin, with a distinct, denser look: a dark sidebar (`#0B1A2A`), 14 px table text, and a "Admin" badge in the header. All actions that change data are written to the **audit log** (who, what, when, before and after).

### I1. Dashboard `/admin`
Tiles: new users (today / 7 days), active tournaments, live auctions now, organizer payments this month (count and total), active subscriptions, failed payments (7 days), open reports, pending refunds. Charts: sign-ups per day (line), tournaments by sport and city (bar), subscription status split. Attention list: open reports, refund requests, failed webhooks.

### I2. Users `/admin/users`
Table: avatar, name, email, city, roles (chips), subscription status, joined, status (Active/Suspended/Banned). Search by name, email, phone, username; filters by city, role, status. Bulk actions limited to export. Row click opens I3.

### I3. User detail `/admin/users/[id]`
Sections: profile info, roles and relationships (tournaments organized, teams managed, tournaments played), subscription and payments history, reports against and by the user, audit trail. Actions: **Suspend** (temporary, with end date and reason), **Ban** (permanent, reason), **Restore**, **Change city** (support), **Send email**, **Impersonate (read-only view)** **[OPEN]**. Every action requires a reason and is logged.

### I4. Tournaments `/admin/tournaments`
Table with all tournaments, filters (status, sport, city, payment status), search. Row actions: View, **Hide** (removes from public lists), **Cancel**, **Restore**.

### I5. Tournament detail `/admin/tournaments/[id]`
Read-only copy of the organizer's tournament manager with extra controls: **Unlock fields**, **Reassign organizer**, **Force status change**, view chat, view payment, internal notes (admin only).

### I6. Payments `/admin/payments`
Organizer fee payments: date, tournament, organizer, tier, amount, status (Created/Paid/Failed/Refunded), Razorpay payment ID (copy button, link to Razorpay dashboard). Filters by status and date; CSV export. Detail drawer with webhook event history. Action: **Mark for refund** (creates a refund request).

### I7. Subscriptions `/admin/subscriptions`
Player subscriptions: user, plan, status, started, next renewal, last payment. Filters by status. Actions: **Cancel subscription** (support), **Grant free period** (extends the paid-until date with a reason; used for support or promotions).

### I8. Refunds `/admin/refunds`
Queue of refund requests with reason, linked payment, policy check (eligible or not as per the Refund policy rules), and status (Requested, Approved, Processed, Rejected). **Approve** executes a Razorpay refund via the server; **Reject** needs a reason. Both notify the user.

### I9. Reports `/admin/reports`
Queue of reports from users (chat messages, profiles, tournaments, contact form submissions). Each shows the reported content snapshot, reporter, count of reports, status (Open, Reviewing, Resolved, Dismissed). Actions: delete content, mute/suspend user, hide tournament, dismiss, add internal note.

### I10. Cities `/admin/cities`
List and editor: city name, state, slug, active toggle, sort order. **City requests** tab lists requests from onboarding with **Add city** one-click. Deactivating a city hides it from selection but does not remove existing data.

### I11. Sports and rules `/admin/sports`
Lists the sports (Cricket, Football). Editor for the `config` (structured form, not raw JSON for common settings; an "Advanced JSON" tab for experts) with a **preview** of the resulting forms. Activate/deactivate a sport for new tournaments.

### I12. Pricing `/admin/pricing`
- **Tournament tiers table:** name, min teams, max teams, fee amount, active toggle, sort. Validation prevents gaps and overlaps. Maximum team count of the highest active tier is the cap shown in the creation form.
- **Player plan:** name, monthly amount, description, benefits text, Razorpay plan ID (created by the server when the price changes), active toggle, **grace period** behaviour for failed payments.
- **Tax settings:** tax percentage and whether prices include tax **[OPEN: accountant input]**.
- Any change asks for confirmation ("This applies to new purchases only") and creates a new version.

### I13. Audit log `/admin/audit-log`
Immutable list: time, actor, action, target, summary; filters by actor, action type, date. Click opens the before/after JSON diff.

### I14. Platform settings `/admin/settings`
Editable site content: FAQ entries, legal page texts (with versioning), contact email, announcement banner (text, color, start/end), maintenance mode toggle (shows J3), feature flags (live auction, chat, open team applications), email template previews.

---

## 22. Data model

Names are indicative; all tables have `id` (uuid), `created_at`, `updated_at` unless noted.

### 22.1 People and places
| Table | Key columns |
|---|---|
| `profiles` | `id` (= auth user id), `full_name`, `username` (unique), `avatar_url`, `bio`, `phone`, `date_of_birth`, `city_id`, `is_admin`, `status` (active/suspended/banned), `onboarded_at`, privacy flags |
| `cities` | `name`, `state`, `slug`, `is_active`, `sort_order` |
| `city_requests` | `user_id`, `city_name`, `email`, `status` |
| `sports` | `slug` (cricket, football), `name`, `config` (json), `is_active` |
| `player_sport_profiles` | `user_id`, `sport_id`, `details` (json: role, batting hand, bowling style, position, foot, jersey pref) |

### 22.2 Tournaments and teams
| Table | Key columns |
|---|---|
| `tournaments` | `organizer_id`, `name`, `slug`, `sport_id`, `city_id`, `venue_name`, `venue_address`, `start_date`, `end_date`, `format` (league/knockout/league_playoffs), `team_count`, `rules` (json: overs, points, tie-breakers, etc.), `squad_mode` (auction/direct), `squad_min`, `squad_max`, `team_entry` (invite/open/both), `team_deadline`, `player_deadline`, `visibility`, `status`, `pricing_tier_id`, `banner_url`, `logo_url`, `description`, `rules_text`, `prizes` (json), `cancelled_reason` |
| `auction_settings` | `tournament_id`, `mode` (live/simple), `purse`, `categories` (json), `base_prices` (json), `increment_slabs` (json), `reserve_rule`, `category_limits` (json), `sequence_mode`, `scheduled_at`, `status` |
| `teams` | `tournament_id`, `name`, `slug`, `logo_url`, `colors`, `manager_id` (nullable), `status` (invited/pending/approved/rejected/withdrawn), `squad_locked` |
| `team_invites` | `team_id`, `code` (unique, hard to guess), `invited_by`, `expires_at`, `used_by`, `used_at`, `status` |
| `player_applications` | `tournament_id`, `user_id`, `status` (pending/approved/rejected/withdrawn), `role`, `experience`, `answers` (json), `notes`, `reviewed_by`, `reject_reason`; unique per (tournament, user) |
| `pool_players` | `tournament_id`, `user_id`, `category`, `base_price`, `sequence_no`, `lot_status` (upcoming/on_block/sold/unsold) |
| `squad_members` | `team_id`, `user_id`, `jersey_no`, `source` (auction/direct/invite), `price` (points), `status`; unique per (tournament, user) |

### 22.3 Auction
| Table | Key columns |
|---|---|
| `auction_lots` | `tournament_id`, `player_id`, `status`, `opened_at`, `closed_at`, `current_bid`, `current_team_id`, `sold_price`, `sold_team_id` |
| `bids` | `lot_id`, `team_id`, `amount`, `placed_by`, `placed_at`, `is_undone`, `undone_by`, `undo_reason` |
| `team_purses` | `team_id`, `total`, `spent` (derived/updated by the sold function) |
| `auction_events` | append-only log for replay and audit |

### 22.4 Matches and stats
| Table | Key columns |
|---|---|
| `matches` | `tournament_id`, `stage` (league/qualifier/semi/final...), `round_no`, `team_a_id`, `team_b_id`, `scheduled_at`, `venue`, `status`, `result_type`, `winner_team_id`, `result_text`, `player_of_match_id`, `score_a` (json), `score_b` (json), `notes`, `published_at` |
| `cricket_batting` | `match_id`, `innings`, `player_id`, `runs`, `balls`, `fours`, `sixes`, `dismissal`, `bowler_id` |
| `cricket_bowling` | `match_id`, `innings`, `player_id`, `overs`, `maidens`, `runs`, `wickets`, `wides`, `no_balls` |
| `cricket_fielding` | `match_id`, `player_id`, `catches`, `run_outs`, `stumpings` |
| `football_events` | `match_id`, `type` (goal/yellow/red/sub), `player_id`, `assist_player_id`, `minute`, `meta` |
| `football_lineups` | `match_id`, `team_id`, `player_id`, `is_starter` |
| `standings` | `tournament_id`, `team_id`, stats columns (played, won, lost, tied/drawn, points, nrr or gf/ga/gd), `position` (rebuilt by function) |

### 22.5 Money (platform's own fees only)
| Table | Key columns |
|---|---|
| `pricing_tiers` | `name`, `min_teams`, `max_teams`, `amount_paise`, `is_active`, `version` |
| `player_plans` | `name`, `amount_paise`, `razorpay_plan_id`, `is_active`, `grace_days`, `version` |
| `tournament_payments` | `tournament_id`, `organizer_id`, `tier_id`, `amount_paise`, `tax_paise`, `status` (created/paid/failed/refunded), `razorpay_order_id`, `razorpay_payment_id`, `invoice_url`, `paid_at` |
| `subscriptions` | `user_id`, `plan_id`, `razorpay_subscription_id`, `status` (created/active/past_due/cancelled/expired), `current_period_end`, `cancel_at_period_end`, `grace_until` |
| `subscription_payments` | `subscription_id`, `amount_paise`, `status`, `razorpay_payment_id`, `paid_at`, `receipt_url` |
| `refunds` | `payment_type`, `payment_id`, `requested_by`, `reason`, `status`, `razorpay_refund_id`, `processed_at` |
| `webhook_events` | `provider`, `event_id` (unique), `type`, `payload`, `processed_at`, `error` |

### 22.6 Community and operations
| Table | Key columns |
|---|---|
| `chat_messages` | `tournament_id`, `user_id`, `body`, `is_deleted`, `deleted_by`, `reply_to` |
| `chat_mutes` | `tournament_id`, `user_id`, `muted_until`, `muted_by` |
| `announcements` | `tournament_id`, `title`, `body`, `is_pinned`, `created_by` |
| `notifications` | `user_id`, `type`, `title`, `body`, `link`, `read_at`, `data` (json) |
| `notification_settings` | `user_id`, per-category booleans |
| `reports` | `reporter_id`, `target_type`, `target_id`, `reason`, `snapshot` (json), `status`, `resolved_by`, `note` |
| `contact_messages` | `name`, `email`, `topic`, `message`, `status` |
| `audit_log` | `actor_id`, `action`, `target_type`, `target_id`, `before` (json), `after` (json), `reason` (append-only) |
| `site_settings` | key/value json for FAQ, banners, flags |

### 22.7 Useful views
`public_tournaments` (only published, public fields), `public_player_profiles` (only fields the player made public), `player_career_stats` (aggregated), `tournament_leaderboards`.

---

## 23. Backend rules (RLS, database functions, edge functions)

### 23.1 Row Level Security principles
- Every table has RLS **on**. Default is deny.
- **Public reads** only through views or policies that expose published data (no drafts, no phone numbers, no payment data).
- **Owner writes:** organizers can write only rows belonging to tournaments where `organizer_id = auth.uid()`.
- **Manager writes:** only rows of the team where `manager_id = auth.uid()`, and only before `squad_locked` and within allowed fields.
- **Player writes:** only their own profile and applications.
- **Money tables:** users can read their own rows; **nobody writes from the client**; only server functions and webhooks (service role) write.
- **Admin:** policies check `profiles.is_admin = true` through a security-definer helper, never from a client-supplied claim.

### 23.2 Database functions (RPC), the "referee"
| Function | Enforces |
|---|---|
| `create_tournament_draft` | Valid sport/city, slug uniqueness, team count within a tier |
| `publish_tournament` | Payment is `paid` for the correct tier; required fields complete |
| `apply_as_player` | Tournament open and not full; **profile city = tournament city**; **subscription active**; no duplicate; creates application |
| `review_application` | Only the organizer; approve adds to the pool (auction) or marks approved (direct) |
| `create_team_invite` / `accept_team_invite` | Code valid, unused, unexpired; one team per manager per tournament; sets `manager_id` |
| `add_squad_player` | Direct mode only; manager of that team; squad max; not locked; player not already in another team in the tournament |
| `lock_pool`, `schedule_auction`, `start_auction` | Readiness checklist satisfied |
| `open_lot`, `place_bid`, `undo_bid`, `close_lot_sold`, `close_lot_unsold`, `pause_auction`, `end_auction` | Section 17.6 rules, transactional, with row locks |
| `generate_fixtures` | Format, team count, scheduling options; refuses if results exist |
| `submit_match_result` / `publish_result` | Organizer only; recalculates standings; audit entry on edits |
| `recompute_standings` | Derives table from published results by the tournament's rules |
| `post_chat_message` | Membership, mute, slow mode, length |
| `change_city` | Allowed any time; logs the change |

### 23.3 Edge functions / server actions
| Function | Job |
|---|---|
| `create-tournament-order` | Looks up the tier fee, creates the Razorpay order, stores the payment row |
| `create-subscription` | Creates or resumes a Razorpay Subscription for the plan |
| `razorpay-webhook` | Verifies the signature; idempotent; updates payments/subscriptions; triggers notifications and invoice generation |
| `process-refund` | Admin-only; calls Razorpay refund API and updates records |
| `generate-invoice` | Builds a PDF receipt and stores it in Storage |
| `send-email` | Templated transactional emails |
| `scheduled jobs` | Reminders (matches, auction, renewals), expiring invites, closing registration at deadlines, cleaning abandoned drafts |

### 23.4 Storage buckets
`avatars`, `team-logos`, `tournament-banners`, `invoices` (private, signed URLs). Upload limits and file type checks enforced in policies.

### 23.5 Rate limits and abuse protection
Login/email sending, contact form, chat messages, bids (one per second per team), invite generation, and search endpoints are rate limited. Server logs capture IP and user for security events.

---

## 24. SEO, sharing, and public data

- Every public page has a unique `<title>` and meta description (e.g. "Raipur Premier League 2026: fixtures, standings, and stats").
- **Open Graph and Twitter card images** are generated per tournament (banner + name + dates + city) and per team and match (scoreboard image), so links shared on WhatsApp look good.
- Structured data (`SportsEvent`) on tournament pages.
- `sitemap.xml` lists cities, public tournaments, teams, and players (only those with a public profile); `robots.txt` blocks `/admin`, `/organizer`, `/manager`, `/player`, auth routes.
- Clean URLs with slugs; changing a slug creates a redirect from the old one.
- Unlisted tournaments get `noindex`.
- Canonical URLs on tab sub-routes.
- Performance targets: LCP under 2.5 s on a mid-range phone over 4G for public pages; the live auction room's bid-to-screen update under 1 second under normal conditions.

---

## 25. Edge cases and error handling

### 25.1 System pages
- **J1 Not found `/404`:** Headline "We couldn't find that page." A line-drawn illustration of a ball missing the stumps. Buttons: **Go home**, **Browse tournaments**. A search box.
- **J2 Something went wrong `/500`:** "Something went wrong on our side." Shows an error reference ID (for support) and buttons **Try again** and **Go home**. Errors are logged.
- **J3 Maintenance `/maintenance`:** "We're making improvements. Back shortly." Optional expected time from Admin > Settings. Admins can still sign in.

### 25.2 Common situations
| Situation | Behaviour |
|---|---|
| User opens a tournament that is a draft | 404 unless they are the owner or an admin |
| Two organizers pick the same slug | The second sees "That web address is taken" with 3 suggestions |
| Organizer tries to publish unpaid | Publish button disabled with tooltip "Pay the tournament fee first" |
| Team count reduced after payment | Not allowed to reduce (fee is not recalculated down); organizer can leave slots empty |
| Organizer deletes the account mid-tournament | Blocked until the tournament is completed, cancelled, or transferred |
| Player applies, then changes city | The application stays valid; the city rule is checked only at application time |
| Player's subscription lapses | Existing applications and squad spots stay valid; new applications are blocked |
| A manager loses connection in the auction | Bid button disabled with "Reconnecting"; after reconnect the state re-syncs; bids made while offline are not queued |
| Organizer closes the console tab during the auction | The auction continues to exist as Live; when they reopen the console it resumes; if absent over 10 minutes, managers see "Waiting for auctioneer" |
| Two people try to edit the same result | The second save shows "This result was updated by someone else. Reload to see changes." |
| Invite link shared to wrong person | The first person to accept gets the team; the organizer can revoke and resend before acceptance, or reassign by removing the manager |
| User under 18 | Allowed with age note; chat and profile visibility defaults are stricter **[OPEN: legal review]** |
| Offline or slow network | Forms keep their data; toasts say "You're offline. Changes will save when you reconnect" only for autosaved drafts |

### 25.3 Form behaviour everywhere
- Disable the submit button while submitting (prevents double submit).
- Validate on blur and again on submit; focus the first invalid field.
- Never lose typed data on a failed submit.
- Destructive actions use a confirm dialog that names the thing being changed ("Delete draft 'Raipur Premier League'?").

---

## 26. Microcopy and tone

**Voice:** plain, direct, friendly, like a good ground manager: clear instructions, no hype, no jargon.
- Sentence case everywhere. Buttons use a verb for the exact action: **Publish tournament**, **Approve player**, **Place bid**, **Save changes**. Toasts reuse the same verb: "Tournament published."
- Never write "Submit" or "Click here".
- Errors say what happened and how to fix it, without apologizing: "Choose at least 3 teams." "That invite has expired. Ask the organizer for a new one."
- Empty states invite one clear action.
- Money wording: always "points" for auction values, always "fee" or "subscription" for platform charges. Never mix them.
- Status wording: use neutral words for unsuccessful auction outcomes ("Not picked this time" rather than "Rejected"), but "Rejected" for applications since the organizer decides.
- Numbers: Indian grouping (12,50,000) for rupee amounts; dates like "14 Dec 2026"; time in 12-hour format with am/pm, in India time unless a user overrides.

**Key texts**
| Place | Text |
|---|---|
| City rule (blocked apply) | "This tournament is in Bhilai. Your city is set to Raipur. Switch your city to apply." |
| Subscription gate | "You need an active subscription to apply. Existing registrations aren't affected." |
| Payments note | "Entry fees and any money between players, teams, and organizers are handled by you outside this platform. Auction points are virtual." |
| Bid blocked: reserve | "This bid would leave too few points to fill your minimum squad." |
| Auction paused | "The auctioneer paused the auction. Bidding will resume shortly." |
| Result saved draft | "Result saved. It's not public until you publish it." |

---

## 27. Build phases for the web app

| Phase | Goal | Pages and features |
|---|---|---|
| **1. Foundation and tournaments** | A tournament can be created, paid, published, and filled with teams and players via direct squads | A1 to A10 (A10 optional), B1 to B4, B6, C1 to C5, D1 to D3, D5, D6, E1, E2, F1, F2, G1, G2, H1 to H5, J1 to J3; admin I1, I2, I3, I4, I6, I7, I10, I12 (minimal); subscription (D4) and organizer checkout (H5) with Razorpay; fixtures generation and manual result (score and winner) entry; standings |
| **2. Auction and chat** | Live auction works end to end | B5, F3, H6; Auction tab; chat; notifications for auction events; simple auction mode |
| **3. Stats and full admin** | Rich stats and operations | E3, H7 full stats entry, leaderboards (B2 Stats tab), I5, I8, I9, I11, I13, I14; match reminders; CSV exports |
| **4. Polish** | Quality | Hindi language, web push, OG image generator, accessibility audit, performance work |

**Definition of done for each page:** designed in light and dark, responsive at the three breakpoints, loading/empty/error states, keyboard navigation checked, permissions verified by tests, and copy reviewed against section 26.

---

## 28. Open decisions

1. **Language:** English only at launch or also Hindi?
2. **Phone number:** verify by OTP later? Who sees it (organizers and managers only when needed)?
3. **Age rules:** minimum age and parental consent text (needs legal review).
4. **Subscription grace period** when a payment fails (days, and what the player sees).
5. **Direct squad adds:** must added players belong to the tournament's city?
6. **Team roster at application time** for open team applications: required or not?
7. **Chat:** link filtering for new users; how long chat stays open after a tournament ends.
8. **Assistant manager** role (v1 or later).
9. **Transfer of tournament ownership** (v1 or later).
10. **Admin impersonation** (read-only view as a user) for support.
11. **Tax handling** on invoices: wording and rates (needs accountant input).
12. **Playoff styles** available in football and whether to support **group stage + knockout** formats (not in v1).
13. **Unsold round** rules and whether unsold players can be added later outside the auction.
14. **Public contact details** shown for organizers: default on or off.
15. **City expansion process:** how new cities get activated and by whom.

---

*End of document.*
