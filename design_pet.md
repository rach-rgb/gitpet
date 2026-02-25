# Petgotchi — Design Document

A GitHub-activity-driven virtual pet game. Users feed and evolve their pet by making real commits and contributions. The pet's health reflects coding consistency; its appearance reflects coding personality.

---

## Table of Contents

1. [Concept & Goals](#1-concept--goals)
2. [Tech Stack](#2-tech-stack)
3. [Pet Stats & Decay](#3-pet-stats--decay)
4. [Interaction Map](#4-interaction-map)
5. [Lifecycle & Evolution](#5-lifecycle--evolution)
6. [Trait System](#6-trait-system)
7. [Appearance System](#7-appearance-system)
8. [User-System Interaction Flows](#8-user-system-interaction-flows)
9. [Security Model](#9-security-model)
10. [Sharing & Social Layer](#10-sharing--social-layer)
11. [Database Schema (D1)](#11-database-schema-d1)
12. [API Route List](#12-api-route-list)
13. [SVG Sprite Architecture](#13-svg-sprite-architecture)
14. [Notification Design](#14-notification-design)
15. [Open Design Items](#15-open-design-items)

---

## 1. Concept & Goals

### Core Idea

Connect a Tamagotchi-style virtual pet to a user's GitHub activity. Commits feed the pet, PRs make it happy, CI passes keep it healthy. Neglect the pet and it withers. Maintain a streak and it evolves.

### Design Principles

- **Consistency wins over volume** — a user committing once a day should have a healthier pet than one spamming 20 empty commits
- **Decay creates urgency, not punishment** — pet never truly dies; it enters a recoverable dormant state
- **Shareable by default** — the pet card embeds anywhere an `<img>` tag works; zero friction for the viewer
- **Zero cost to run** — entire stack fits within free tiers permanently for a toy-scale project

### What Differentiates This

Most existing tools (e.g. `cli-pet`, `termagotchi`) are terminal-only, text-based, and personal. Petgotchi adds:
- Pixel-art sprites with trait-based visual identity
- Evolution tied to both XP and time (not gameable by spamming)
- **Difficulty Levels**: Choose your challenge (Easy, Normal, Hard) upon adoption
- **Hall of Fame**: Retire legendary pets to start a new legacy
- Embeddable live card for GitHub profile READMEs

---

## 2. Tech Stack

All components run on the Cloudflare free tier.

```
Cloudflare Pages       → frontend (web dashboard, onboarding)
Cloudflare Workers     → API / serverless backend, SVG card generation
Cloudflare D1          → SQLite database (pet state, users, activity log)
Cloudflare Cron        → periodic pet decay + GitHub sync
GitHub OAuth App       → authentication (no passwords handled)
GitHub REST API        → contribution data source (polling, no webhook setup needed)
```

### Why Cloudflare Over Alternatives

| Option | Problem |
|---|---|
| Vercel + Supabase | Supabase pauses project after 1 week inactivity |
| Render free DB | Deletes database after 90 days inactivity |
| Railway | Free tier removed; minimum $5/month |
| Cloudflare | D1 free: 5GB, 25B row reads/month. Workers free: 100k req/day. No sleep, no pause. |

### Rate Limit Budget (GitHub API)

- 5000 requests/hour per authenticated token
- Cron runs every 30 minutes = 2 runs/hour per user
- Each run = 1 API call per user
- Comfortably supports ~2500 active users at zero cost

---

## 3. Pet Stats & Decay

### Four Stat Axes

Each axis maps to a different type of git activity, encouraging diverse participation. Values decay based on the chosen **Difficulty Level** (Normal rates shown below).

```
Hunger    ████████░░   0.4 pts/hour
Happiness ██████░░░░   0.4 pts/hour
Health    █████████░   0.4 pts/hour
XP        ███░░░░░░░   never decays — drives evolution only
```

All stats clamped between 0 and 100. **Initial value at hatch: 100% for all stats.**

### Difficulty Levels

Selected during pet adoption. Affects decay speed and XP gain.

| Level | Decay Multiplier | XP Multiplier | Description |
|---|---|---|---|
| **Easy** | 0.5x | 1.2x | For casual coders; pet is very hardy. |
| **Normal** | 1.0x | 1.0x | The standard experience; ~10 days to dormant. |
| **Hard** | 2.0x | 0.8x | For daily grinders; neglect is punished fast. |

### Visual Thresholds per Stat

| Range | State | Visual Cue |
|---|---|---|
| 70–100 | Full / Cheerful / Healthy | Normal colors, smooth animation |
| 40–69 | Neutral | Slightly muted |
| 20–39 | Warning Zone | Desaturated, drooped posture |
| 1–19 | Danger Zone | Color shift, particle effects |
| 0 | Critical | Triggers dormant check |

### Dormant State

When **all three stats (Hunger, Happiness, Health) simultaneously reach 0**, the pet enters Dormant state.

- Pet is grey, curled up, `zzz` particle animation
- Not dead — fully recoverable
- First commit after dormancy triggers revival animation + 2x XP bonus for 24 hours
- Comeback is emotionally rewarding, not shameful

---

## 4. Interaction Map

### Git Event → Stat Gains

| Git Event | Hunger | Happiness | Health | XP |
|---|---|---|---|---|
| Push (commit) | +15 | +5 | 0 | +10 |
| Push with tests (e.g. `tests/`) | +15 | +5 | +20 | +15 |
| Push with descriptive msg (>20 chars) | +5 bonus | — | — | +5 |
| PR opened | +5 | +15 | 0 | +10 |
| PR merged | +10 | +30 | +10 | +25 |
| Code review given | 0 | +20 | +10 | +15 |
| Issue closed | 0 | +15 | 0 | +10 |
| Diverse Repos (3+ repos/hour) | +10 | +10 | +10 | +20 |
| 7-day streak bonus | +20 | +20 | +20 | +30 |

> [!NOTE]
> All Stat/XP gains are multiplied by the pet's **Difficulty Level** multipliers.

### Spam Protection Rules

- Max **3 commits scored per hour** per user
- Commits with **< 5 lines changed** score at 20% value
- **Identical commit messages** within 24h: second one scores 0
- **Empty commits** (no file changes): score 0
- Commit message quality check: keyword blocklist for `fix`, `wip`, `test`, `asdf`, etc. when used alone

### Urgency Loop (Normal Difficulty Example)

Assumes start at 100% stats. Decay: 0.4/hr.

```
Day 1–3 since last commit
  → stats > 70
  → pet looks healthy, smooth animation

Day 5
  → all stats ~52
  → pet enters Neutral zone, visual cues slightly muted

Day 8
  → all stats ~23
  → enters Warning Zone
  → README card now shows hungry/sad state

Day 10
  → Stats hit 0
  → Critical / Dormant Trigger
  → Strongest emotional re-engagement moment
```

---

## 5. Lifecycle & Evolution

Evolution requires **both accumulated XP and minimum elapsed time**. Time gates prevent rushing via commit spam.

### Stages

```
Stage 0: Egg
  Unlock:   on account creation
  Hatch:    on first commit
  Visual:   trait color tints shell; cracks appear as XP grows

Stage 1: Hatchling  (0–200 XP)
  Visual:   small, rough — unformed
  Mechanic: teaches core loop; obvious hunger cues; accessory hinted

Stage 2: Fledgling  (200–600 XP + 7 days minimum)
  Visual:   trait accessory fully visible; trait-specific idle animation
  Mechanic: TRAIT LOCKED at this stage based on dominant activity in first 7 days

Stage 3: Adult  (600–1500 XP + 30 days minimum)
  Visual:   full sprite, confident proportions; background detail on card
  Mechanic: stat floors — happiness never drops below 10 if streak ≥ 3 days
            sharing card unlocked with visible traits

Stage 4: Elder  (1500+ XP + 90 days minimum)
  Visual:   silver streak, worn accessory, aura/glow on card
  Mechanic: mentor bonus — reviewing PRs doubles XP gain for 24h
            dormant recovery is instant

Stage 5: Legendary  (365-day streak OR 5000+ XP)
  Visual:   particle effects, unique frame, legendary accessory variant
  Mechanic: **Prestige Unlock** — pet can now be retired to the Hall of Fame. 
            Retiring grants a "Legacy Medal" on the user's public profile and 
            allows adopting a new Egg from stage 0.
```

### Level Calculation

Level is derived directly from XP:
`Level = floor(sqrt(XP / 10))`

| XP | Level |
|---|---|
| 0–39 | 0 |
| 10 | 1 |
| 40 | 2 |
| 250 | 5 |
| 1000 | 10 |
| 5000 | 22 (Prestige range) |

---

## 6. Trait System

### Trait Lock Mechanic

At **Stage 2 (Fledgling)**, the pet's trait locks permanently. The lock reads from `trait_tally`, which has been accumulating scores since egg creation. `trait_tally.tracking_until = born_at + 604800` — scores after that timestamp are ignored. The trait is determined by whichever bucket had the highest total across the first 7 calendar days from `born_at`.

### Traits

| Trait | Dominant Activity | Stat Bonus | Visual Identity |
|---|---|---|---|
| Lone Coder | Solo commits, single-repo focus | +20% hunger per commit | Angular, hooded, headphones |
| Collaborator | PRs + code reviews | +20% happiness from social events | Round, scarfed, open arms |
| Craftsman | CI passes + test commits | +20% health from green builds | Sturdy, goggled, tool belt |
| Architect | Issues closed + diverse repos | +10% all stats | Tall, bespectacled, blueprints |
| Sprinter | High-streak, consistent daily commits | Decay rate −25% | Lean, sneakers, motion blur |

### Trait-Specific Idle Animations (Stage 2+)

| Trait | Idle Animation |
|---|---|
| Lone Coder | Types on a tiny keyboard |
| Collaborator | Waves at passersby |
| Craftsman | Fidgets with a tiny wrench |
| Architect | Studies a tiny scroll |
| Sprinter | Bounces foot impatiently |

---

## 7. Appearance System

### Two-Axis Visual Model

```
TRAIT  (locked at Stage 2)
  ×
STAGE  (changes over time)
  +
HEALTH STATE OVERLAY  (applied on top)
  =
FINAL SPRITE
```

At Stage 3 Adult: **5 trait sprites** exist as files. Health states are palette transforms applied at render time — not separate files. The render pipeline produces `5 traits × 4 health states = 20 visual variations` from those 5 files.

### Health State Overlays

Applied on top of any trait+stage combination — overlays, not full redraws.

| Health State | Trigger | Visual |
|---|---|---|
| Healthy | All stats > 70 | Normal colors, smooth animation |
| Hungry | Hunger < 40 | Desaturated, holds empty bowl |
| Sad | Happiness < 30 | Drooped posture, rain cloud |
| Sick | Health < 25 | Green tint, red eyes, cough particles |
| Dormant | All stats = 0 | Grey, curled up, `zzz` particles, dim bg |
| Reviving | First commit after dormant | Brief golden flash animation |

### Legendary Accessory Variants (Stage 5)

| Trait | Normal Accessory | Legendary Version |
|---|---|---|
| Lone Coder | Headphones | Glowing neural interface |
| Collaborator | Scarf | Radiant aura |
| Craftsman | Goggles | Multi-lens HUD |
| Architect | Glasses | Holographic blueprint |
| Sprinter | Sneakers | Afterburn trail |

### Card Layout

See §13 for the full SVG coordinate layout and pixel map rendering pipeline. Card dimensions are `400×160` viewBox, sprite on the left (`80×80` at `x=20 y=30`), stats panel on the right. Trait name, level, and streak are all visible — this is the social status layer.

---

## 8. User-System Interaction Flows

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare Edge                       │
│                                                         │
│  Pages (Frontend)  ←→  Workers (API)  ←→  D1 (DB)      │
│                              ↕                          │
│                     Workers Secrets                     │
│                   (tokens, keys, salts)                 │
└─────────────────────────────┬───────────────────────────┘
                              │  HTTPS only
              ┌───────────────┼───────────────┐
              ↓               ↓               ↓
         GitHub API     GitHub OAuth     User Browser
```

---

### Flow 1: Registration (GitHub OAuth)

```
User                  CF Worker               GitHub
 │                        │                      │
 │  GET /                 │                      │
 │───────────────────────>│                      │
 │  [landing page]        │                      │
 │<───────────────────────│                      │
 │                        │                      │
 │  Click "Connect GitHub"│                      │
 │───────────────────────>│                      │
 │                        │ generate state token │
 │                        │ store in D1 (ttl 10m)│
 │  redirect to GitHub    │                      │
 │<───────────────────────│                      │
 │                        │                      │
 │  GET github.com/login/oauth/authorize          │
 │    ?client_id=xxx                              │
 │    &state=<random_32_bytes>                    │
 │    &scope=read:user                            │
 │──────────────────────────────────────────────>│
 │  [user approves on GitHub]                     │
 │<──────────────────────────────────────────────│
 │                        │                      │
 │  GET /auth/callback    │                      │
 │    ?code=xxx&state=yyy │                      │
 │───────────────────────>│                      │
 │                        │ verify state (CSRF)  │
 │                        │                      │
 │                        │ POST /login/oauth/   │
 │                        │   access_token       │
 │                        │─────────────────────>│
 │                        │ { access_token }     │
 │                        │<─────────────────────│
 │                        │                      │
 │                        │ encrypt token        │
 │                        │ create user in D1    │
 │                        │ create pet in D1     │
 │                        │ set session cookie   │
 │  redirect /onboarding  │                      │
 │<───────────────────────│                      │
```

Tables written during this flow: `users`, `sessions`, `oauth_states`. See §11 for full schema.

---

### Flow 2: Onboarding → Adding the Card

After OAuth, user names their pet. The embed snippet is immediately live.

```
User                  CF Worker           D1
 │                        │                │
 │  POST /api/pet         │                │
 │  { "name": "Pixy" }    │                │
 │───────────────────────>│                │
 │                        │ validate session│
 │                        │ INSERT pets ──>│
 │                        │ INSERT         │
 │                        │  trait_tally ─>│
 │  201 { pet_id, name,   │                │
 │        stage, born_at }│                │
 │<───────────────────────│                │
```

Initial values: `hunger=50, happiness=50, health=100, xp=0, stage=0, trait=NULL`. See §11 `pets` and `trait_tally` tables for full column definitions. See §12 `POST /api/pet` for validation rules.

**Card setup page:**

```
Your pet card is live at:

  https://petgotchi.dev/api/card/username

Add it to your GitHub profile README:

  ![Pixy](https://petgotchi.dev/api/card/username)

  [Copy snippet]   [Open profile README on GitHub ↗]
```

No CLI, no config file, no installation. One URL.

---

### Flow 3: Dashboard (Status in Browser)

```
User                  CF Worker           D1
 │                        │                │
 │  GET /dashboard        │                │
 │───────────────────────>│                │
 │                        │ read session   │
 │                        │ cookie ───────>│
 │                        │ validate ──────│
 │                        │<───────────────│
 │                        │ fetch pet ────>│
 │                        │<───────────────│
 │                        │ fetch activity │
 │                        │ log (last 20)─>│
 │                        │<───────────────│
 │  [dashboard HTML]      │                │
 │<───────────────────────│                │
```

Dashboard is **server-rendered HTML** from the Worker — no client-side API calls, no token ever reaches the browser.

**Dashboard layout:**

```
┌──────────────────────────────────────────────┐
│  petgotchi              [username]  [logout]  │
├──────────────────────────────────────────────┤
│                                              │
│      [SPRITE — live animated SVG]            │
│      Pixy  ·  Lv.4 Fledgling  ·  Craftsman  │
│                                              │
│      Hunger    [████████░░]  80%             │
│      Happiness [██████░░░░]  60%             │
│      Health    [█████████░]  90%             │
│                                              │
│      XP  340/600  ·  streak  12 days         │
│                                              │
├──────────────────────────────────────────────┤
│  Recent activity                             │
│  ───────────────────────────                 │
│  2h ago  · push · repo/api    +15 hunger     │
│  1d ago  · PR merged          +30 happiness  │
│  2d ago  · push · repo/web    +15 hunger     │
│                                              │
├──────────────────────────────────────────────┤
│  Embed your card                             │
│  ![Pixy](https://petgotchi.dev/api/card/...) │
│  [Copy]                                      │
└──────────────────────────────────────────────┘
```

---

### Flow 4: Git Contribution Sync (Cron Polling)

No webhook setup needed from the user. A Cloudflare Cron Trigger (`*/30 * * * *`) polls GitHub every 30 minutes. Polling is used instead of webhooks because `/users/{username}/events` returns 300 events of history — sufficient for 30-min intervals with zero user setup required.

See §12 `syncAndDecay` for the full step-by-step pseudocode including scoring, decay, streak, dormant, revival, and stage upgrade logic.

---

### Flow 5: Card Render (Public Endpoint)

`GET /api/card/:username` — no auth required. Worker reads pet state from D1, runs the SVG generation pipeline, returns `image/svg+xml` with `Cache-Control: public, max-age=300`.

See §13 for the full SVG generation pipeline. See §12 `GET /api/card/:username` for response headers and the placeholder SVG behavior on unknown usernames.

**GitHub Camo caching:** GitHub proxies all embedded images through Camo and caches aggressively (up to several hours) regardless of `Cache-Control` headers. The README card is eventually consistent by design — the game rhythm is daily, not real-time. The web dashboard always shows live state.

---

## 9. Security Model

### Threat Matrix

| Threat | Mitigation |
|---|---|
| CSRF on OAuth callback | State token (32 random bytes), 10-min TTL in D1, verified server-side before token exchange |
| Token theft from database | AES-256 encryption; key stored only in Workers Secrets, never in code or wrangler.toml |
| Session hijacking | `HttpOnly; Secure; SameSite=Strict; Max-Age=2592000` cookie |
| XSS | Server-rendered HTML; no user content reflected in page output |
| SVG injection via pet name | Name sanitized on input: alphanumeric + spaces only, max 20 chars |
| GitHub token scope creep | `scope=read:user` only — no write access, no repo access |
| Card endpoint abuse | Cloudflare rate limiting: 60 req/min/IP, free on Workers |
| Commit spam inflation | Scoring caps: 3 commits/hour max, min-lines threshold, message dedup |
| Secrets in source code | All secrets via `wrangler secret put`, never in `wrangler.toml` or committed files |

### Workers Secrets Checklist

```bash
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put TOKEN_ENCRYPTION_KEY    # 32-byte AES-256 key
wrangler secret put SESSION_SIGNING_KEY     # for HMAC cookie signing
```

`read:user` scope is sufficient for fetching user ID/username on login and reading public events via `/users/{username}/events`. No `repo` scope, no write permissions.

---

## 10. Sharing & Social Layer

### Embeddable Card (Core Feature)

The primary sharing mechanism. A single `<img>` URL works anywhere:

```markdown
![Pixy](https://petgotchi.dev/api/card/username)
```

Works in:
- GitHub profile README
- Repo READMEs
- Personal websites
- Twitter/X bio (as image URL)
- Notion, Linear, anywhere img tags render

### Public Pet Profile Page

`petgotchi.dev/u/:username` — a public URL for anyone to visit.

Shows:
- Full-size animated pet sprite
- Current stats
- Evolution stage and trait
- Recent activity feed (last 7 days)
- Streak count
- Embed snippet for visitors to copy

### Snapshot Sharing

One-click sharing of current pet state. **Deferred — requires investigation.** Cloudflare Workers cannot render PNG natively; options are: (a) link directly to the SVG card URL for sharing as-is, (b) use a headless browser service (adds cost/complexity), or (c) serve the SVG and let the user screenshot it. Option (a) is the zero-cost path and sufficient for v1.

### Virality Loop

```
User commits → pet evolves visually
  → user shares card on GitHub profile
  → visitor sees it, curious
  → visitor signs up, connects GitHub
  → visitor commits to feed their pet
  → loop repeats
```

The README card does passive marketing — it's visible to anyone who visits the developer's GitHub profile, which is exactly where the target audience already is.

---

## 11. Database Schema (D1)

D1 is Cloudflare's managed SQLite. All tables use Unix epoch seconds for timestamps and `TEXT` UUIDs generated in application code. Booleans are stored as `INTEGER (0|1)` — SQLite has no native boolean type. Stats are `REAL` to preserve precision across fractional hourly decay.

**Connection requirement:** `PRAGMA foreign_keys = ON` must be set on every D1 connection. D1 does not enable this by default.

---

### Table Overview

```
users               core identity, encrypted GitHub token
sessions            auth session tokens (30-day TTL)
oauth_states        CSRF state tokens for OAuth flow (10-min TTL)
pets                full pet state — stats, stage, trait, streaks, difficulty
hall_of_fame        retired pets (Stage 5+)
trait_tally         running score for trait lock decision (first 7 days)
activity_log        every scored event and decay tick
processed_events    deduplication guard for GitHub event IDs (7-day TTL)
notifications       stored positive events (evolution, milestones) pending user dismissal
```

---

### `users`

Stores one row per GitHub account. `github_id` is the stable identifier — `github_username` can change and is refreshed on every login.

```sql
CREATE TABLE users (
  user_id         TEXT    PRIMARY KEY,              -- UUID, generated in app
  github_id       INTEGER NOT NULL UNIQUE,          -- GitHub numeric ID, immutable
  github_username TEXT    NOT NULL,                 -- refreshed on each login
  token_encrypted TEXT    NOT NULL,                 -- AES-256; key in Workers Secrets
  created_at      INTEGER NOT NULL,                 -- Unix seconds
  last_active     INTEGER NOT NULL,                 -- last web app login
  last_sync       INTEGER NOT NULL DEFAULT 0        -- last GitHub events poll
);

CREATE UNIQUE INDEX idx_users_github_id       ON users(github_id);
CREATE INDEX        idx_users_github_username ON users(github_username);
```

---

### `sessions`

One row per active browser session. Deleted on logout or expiry.

```sql
CREATE TABLE sessions (
  session_id TEXT    PRIMARY KEY,       -- 32 random bytes, hex-encoded
  user_id    TEXT    NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL          -- created_at + 2592000 (30 days)
);

CREATE INDEX idx_sessions_user_id   ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);  -- for cleanup cron
```

---

### `oauth_states`

Single-use CSRF state tokens for the OAuth callback. Deleted immediately after successful use. Cron cleans up any tokens older than 10 minutes.

```sql
CREATE TABLE oauth_states (
  state      TEXT    PRIMARY KEY,   -- 32 random bytes, hex-encoded
  created_at INTEGER NOT NULL       -- expires after 600 seconds
);
```

---

### `pets`

Core pet state. One row per user (`UNIQUE` on `user_id`). All stat mutations go through this table.

```sql
CREATE TABLE pets (
  -- identity
  pet_id              TEXT    PRIMARY KEY,
  user_id             TEXT    NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  name                TEXT    NOT NULL,              -- max 20 chars, alphanumeric + spaces

  -- stage & trait
  stage               INTEGER NOT NULL DEFAULT 0,
    -- 0=Egg, 1=Hatchling, 2=Fledgling, 3=Adult, 4=Elder, 5=Legendary
  trait               TEXT,
    -- NULL until locked at Stage 2
    -- 'lone_coder' | 'collaborator' | 'craftsman' | 'architect' | 'sprinter'

  -- live stats (0.0–100.0)
  hunger              REAL    NOT NULL DEFAULT 100.0,
  happiness           REAL    NOT NULL DEFAULT 100.0,
  health              REAL    NOT NULL DEFAULT 100.0,

  -- progression
  xp                  INTEGER NOT NULL DEFAULT 0,    -- never decays
  streak_current      INTEGER NOT NULL DEFAULT 0,    -- consecutive days with qualifying commits
  streak_longest      INTEGER NOT NULL DEFAULT 0,    -- all-time best
  streak_last_date    TEXT,                          -- 'YYYY-MM-DD' of last scored commit day

  -- dormant state
  is_dormant          INTEGER NOT NULL DEFAULT 0,    -- 0|1
  dormant_since       INTEGER,                       -- NULL if not dormant

  -- legendary (non-revocable)
  legendary_achieved    INTEGER NOT NULL DEFAULT 0,  -- 0|1
  legendary_achieved_at INTEGER,                     -- NULL until earned

  -- settings
  difficulty          TEXT NOT NULL DEFAULT 'normal', -- 'easy' | 'normal' | 'hard'

  -- lifecycle timestamps
  born_at             INTEGER NOT NULL,              -- egg created
  hatched_at          INTEGER,                       -- NULL until first commit
  trait_locked_at     INTEGER,                       -- NULL until Stage 2 transition

  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL
);

CREATE INDEX idx_pets_user_id        ON pets(user_id);
CREATE INDEX idx_pets_stage          ON pets(stage);
CREATE INDEX idx_pets_streak_current ON pets(streak_current DESC);  -- leaderboard
```

**Stage transition conditions:**

| From → To | XP threshold | Minimum elapsed time |
|---|---|---|
| Egg → Hatchling | first commit | — |
| Hatchling → Fledgling | 200 XP | 7 days from `born_at` |
| Fledgling → Adult | 600 XP | 30 days from `born_at` |
| Adult → Elder | 1500 XP | 90 days from `born_at` |
| Any → Legendary | 365-day streak at any point | — (special condition) |

---

### `trait_tally`

Running score used to determine which trait to lock at Stage 2. One row per user, seeded at egg creation. Each cron sync adds to the appropriate bucket based on event type. Ignored after `is_locked = 1`.

```sql
CREATE TABLE trait_tally (
  user_id          TEXT    PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,

  -- each bucket maps to one trait
  solo_commit_score  REAL NOT NULL DEFAULT 0.0,  -- → Lone Coder
  social_score       REAL NOT NULL DEFAULT 0.0,  -- PRs + reviews → Collaborator
  quality_score      REAL NOT NULL DEFAULT 0.0,  -- CI + test commits → Craftsman
  diversity_score    REAL NOT NULL DEFAULT 0.0,  -- issues + multi-repo → Architect
  streak_score       REAL NOT NULL DEFAULT 0.0,  -- streak bonuses → Sprinter

  tracking_until   INTEGER NOT NULL,             -- born_at + 604800 (7 days in seconds)
  is_locked        INTEGER NOT NULL DEFAULT 0    -- 0|1; set to 1 after trait written to pets
);
```

**Bucket → Trait mapping:**

| Highest bucket | Trait locked |
|---|---|
| `solo_commit_score` | Lone Coder |
| `social_score` | Collaborator |
| `quality_score` | Craftsman |
| `diversity_score` | Architect |
| `streak_score` | Sprinter |

Tie-breaking rule: if two buckets are equal, priority order is `quality > social > solo > diversity > streak`.

---

### `hall_of_fame`

Snapshots of retired pets. Schema mirrors `pets` but without live `user_id` constraint (one user can have many retired pets).

```sql
CREATE TABLE hall_of_fame (
  history_id          TEXT    PRIMARY KEY,
  user_id             TEXT    NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  pet_id              TEXT    NOT NULL,
  name                TEXT    NOT NULL,
  stage               INTEGER NOT NULL,
  trait               TEXT    NOT NULL,
  difficulty          TEXT    NOT NULL,
  xp                  INTEGER NOT NULL,
  streak_longest      INTEGER NOT NULL,
  born_at             INTEGER NOT NULL,
  retired_at          INTEGER NOT NULL
);

CREATE INDEX idx_hof_user_id ON hall_of_fame(user_id);
```

---

### `activity_log`

Append-only record of every scored event and every decay tick. Used for the dashboard activity feed and audit trail. Never mutated after insert.

```sql
CREATE TABLE activity_log (
  log_id           TEXT    PRIMARY KEY,           -- UUID
  user_id          TEXT    NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  pet_id           TEXT    NOT NULL REFERENCES pets(pet_id)   ON DELETE CASCADE,

  event_type       TEXT    NOT NULL,
    -- 'push' | 'pr_opened' | 'pr_merged' | 'review_given'
    -- 'issue_closed' | 'ci_passed' | 'ci_fixed'
    -- 'streak_bonus' | 'decay' | 'revival' | 'dormant'

  -- source tracing
  github_event_id  TEXT,                          -- NULL for decay/revival/dormant
  repo_name        TEXT,                          -- NULL for non-repo events

  -- stat deltas (negative values = decay)
  hunger_delta     REAL    NOT NULL DEFAULT 0.0,
  happiness_delta  REAL    NOT NULL DEFAULT 0.0,
  health_delta     REAL    NOT NULL DEFAULT 0.0,
  xp_delta         INTEGER NOT NULL DEFAULT 0,

  -- push event detail
  commit_count     INTEGER,                       -- NULL for non-push events
  lines_changed    INTEGER,                       -- NULL for non-push events

  -- scoring metadata
  multiplier       REAL    NOT NULL DEFAULT 1.0,  -- spam cap or quality bonus applied
  notes            TEXT,                          -- 'spam_cap' | 'quality_bonus' | 'empty_commit' | etc.

  scored_at        INTEGER NOT NULL
);

CREATE INDEX idx_activity_log_user_id     ON activity_log(user_id);
CREATE INDEX idx_activity_log_user_scored ON activity_log(user_id, scored_at DESC);  -- dashboard feed
CREATE INDEX idx_activity_log_github_id   ON activity_log(github_event_id)
  WHERE github_event_id IS NOT NULL;              -- partial index for dedup check
```

---

### `processed_events`

Guards against scoring the same GitHub event twice across cron runs. Entries older than 7 days are deleted by a cleanup cron — GitHub's events API only returns the last 300 events anyway, so there is no risk of re-processing stale events.

```sql
CREATE TABLE processed_events (
  event_id     TEXT    PRIMARY KEY,               -- GitHub's event ID string
  user_id      TEXT    NOT NULL,
  processed_at INTEGER NOT NULL
);

CREATE INDEX idx_processed_events_user ON processed_events(user_id, processed_at);
```

---

### Entity Relationship Diagram

```
users
  │── (1:1) ──► pets
  │               └── (1:1) ──► trait_tally
  │── (1:N) ──► sessions
  │── (1:N) ──► activity_log ◄─── pets
  │── (1:N) ──► processed_events
  │── (1:N) ──► notifications
  └── (standalone) oauth_states  (no FK; short-lived)
```

---

### Data Lifecycle & Cleanup

| Table | Retention | Cleanup Trigger |
|---|---|---|
| `oauth_states` | 10 minutes | Deleted on use; cron removes expired rows |
| `sessions` | 30 days | Deleted on logout; cron removes expired rows |
| `processed_events` | 7 days | Cron deletes rows where `processed_at < now - 604800` |
| `activity_log` | Indefinite | Kept for full user history; dashboard queries use `LIMIT` |
| `notifications` | Until seen or account deletion | `seen=1` rows can be pruned periodically; `CASCADE DELETE` on account deletion |
| `pets`, `trait_tally`, `users` | Until account deletion | `CASCADE DELETE` from `users` clears all child rows |

---

### Key Design Decisions

| Decision | Reason |
|---|---|
| Stats as `REAL` not `INTEGER` | Decay is fractional (e.g. 0.5/hr). Integer storage would accumulate rounding errors over days. |
| Timestamps as `INTEGER` (Unix seconds) | Simple, sortable, no timezone handling required. |
| Booleans as `INTEGER (0\|1)` | SQLite has no native boolean. |
| UUIDs as `TEXT` | D1/SQLite has no native UUID type. Generated in Worker via `crypto.randomUUID()`. |
| One pet per user (`UNIQUE` on `pets.user_id`) | Keeps v1 simple. Multi-pet can be added later by dropping the unique constraint. |
| `github_username` refreshed on login | GitHub usernames can change. `github_id` is the permanent stable key. |
| `trait_tally` as a separate table | Keeps `pets` table clean. Tally is only relevant for 7 days then locked — no need to carry it in the hot path. |
| Append-only `activity_log` | Simplifies audit, debugging, and the dashboard feed. No row is ever updated or deleted (except on account deletion). |

---

## 12. API Route List

Cloudflare Workers handles all HTTP traffic. Pages serves static assets. Routes are grouped by concern.

**Auth convention:**
- `Public` — no session required
- `Auth` — valid session cookie required; returns `401` if missing or expired
- `Internal` — Cloudflare Cron Trigger only; not reachable via HTTP

**Response convention:**
- All API responses are `application/json` unless noted
- Errors always return `{ "error": "message" }`
- Timestamps in responses are Unix seconds (integers)

---

### Page Routes (HTML)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Public | Landing page |
| GET | `/onboarding` | Auth | Pet naming page; redirects to `/dashboard` if pet already exists |
| GET | `/dashboard` | Auth | Main dashboard; redirects to `/` if no session |
| GET | `/u/:username` | Public | Public pet profile page |

---

### Auth Routes

#### `GET /auth/login`

Generates CSRF state token, stores it in `oauth_states`, redirects to GitHub.

```
Auth:     Public
Response: 302 → github.com/login/oauth/authorize
            ?client_id={GITHUB_CLIENT_ID}
            &state={random_32_bytes_hex}
            &scope=read:user
```

---

#### `GET /auth/callback`

Receives OAuth redirect from GitHub. Verifies state, exchanges code for token, creates or updates user, sets session cookie.

```
Auth:     Public
Query:    code=string  state=string

Success:  302 → /onboarding   (new user, no pet yet)
          302 → /dashboard    (returning user)

Errors:
  400  missing code or state parameter
  403  state mismatch (CSRF) or expired state token
  502  GitHub token exchange failed
```

Side effects:
- Deletes used row from `oauth_states`
- Inserts into `users` (new) or updates `github_username` (returning)
- Inserts into `sessions`
- Sets cookie: `session=...; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`

---

#### `POST /auth/logout`

Ends the current session.

```
Auth:     Auth
Body:     (none)

Response:
  200  { "ok": true }
       Clears session cookie
       Deletes session row from D1
```

---

### API — User

#### `GET /api/me`

Returns the current user's profile and pet summary. Used by the dashboard on initial load.

```
Auth:     Auth

Response 200:
{
  "user_id":         "uuid",
  "github_username": "string",
  "created_at":      1234567890,
  "pet": {           // null if not yet created
    "name":          "string",
    "stage":         0,
    "stage_name":    "Egg",
    "trait":         null,
    "is_dormant":    false
  }
}
```

---

### API — Pet

#### `POST /api/pet`

Creates the pet. Called once from the onboarding page.

```
Auth:     Auth
Body:     { "name": "string", "difficulty": "string" }

Validation:
  name: 1–20 chars, alphanumeric + spaces only
  difficulty: "easy" | "normal" | "hard"

Response 201:
{
  "pet_id":   "uuid",
  "name":     "string",
  "stage":    0,
  "difficulty": "normal",
  "born_at":  1234567890
}

Errors:
  400  name validation failed   { "error": "invalid name" }
  409  pet already exists       { "error": "pet already created" }
```

Side effects:
- Inserts into `pets` with `hunger=100, happiness=100, health=100, xp=0`
- Inserts into `trait_tally` with `tracking_until = now + 604800`

---

#### `GET /api/pet`

Returns full live pet state for the authenticated user. Primary data source for the dashboard.

```
Auth:     Auth

Response 200:
{
  "pet_id":               "uuid",
  "name":                 "string",
  "stage":                0,            // 0–5
  "stage_name":           "Egg",        // Egg | Hatchling | Fledgling | Adult | Elder | Legendary
  "trait":                null,         // null | "lone_coder" | "collaborator" | "craftsman" | "architect" | "sprinter"
  "hunger":               80.5,         // 0.0–100.0
  "happiness":            62.0,
  "health":               91.3,
  "xp":                   340,
  "xp_to_next_stage":     260,          // null if Legendary
  "streak_current":       12,
  "streak_longest":       30,
  "is_dormant":           false,
  "dormant_since":        null,         // Unix seconds | null
  "legendary_achieved":   false,
  "born_at":              1234567890,
  "hatched_at":           1234567900    // null if still Egg
}

Errors:
  404  no pet found for this user
```

---

#### `GET /api/activity`

Paginated activity log for the authenticated user. Dashboard shows most recent 20.

```
Auth:     Auth
Query:    limit=20 (max 50)   offset=0

Response 200:
{
  "items": [
    {
      "log_id":          "uuid",
      "event_type":      "push",        // push | pr_opened | pr_merged | review_given |
                                        // issue_closed | ci_passed | ci_fixed |
                                        // streak_bonus | decay | revival | dormant
      "repo_name":       "user/repo",   // null for decay/revival/dormant
      "hunger_delta":    15.0,          // negative for decay
      "happiness_delta": 5.0,
      "health_delta":    0.0,
      "xp_delta":        10,
      "commit_count":    3,             // null for non-push events
      "lines_changed":   142,           // null for non-push events
      "multiplier":      1.0,           // <1.0 if spam cap applied
      "notes":           null,          // "spam_cap" | "quality_bonus" | "empty_commit" | null
      "scored_at":       1234567890
    }
  ],
  "total":    47,
  "has_more": true
}
```

---

#### `POST /api/pet/retire`

Moves the current pet to the Hall of Fame. Only allowed if `stage = 5`.

```
Auth:     Auth
Body:     (none)

Response 200:
{
  "retired": true,
  "pet_id":  "uuid"
}
```

Side effects:
- INSERT current `pets` data into `hall_of_fame`
- DELETE row from `pets` (allowing a new pet to be created)
- CASCADE DELETE from `trait_tally` and `processed_events` (optional, or keep for history)

---

#### `GET /api/hall-of-fame`

Returns the user's retired pets.

```
Auth:     Auth
Response 200:
{
  "items": [
    {
      "pet_id": "uuid",
      "name": "string",
      "trait": "string",
      "xp": 5000,
      "retired_at": 1234567890
    }
  ]
}
```

---

### API — Card (Public)

#### `GET /api/card/:username`

Public endpoint. Returns the pet as an embeddable SVG. No auth. Rate-limited by Cloudflare (60 req/min/IP).

```
Auth:     Public
Params:   username — GitHub username

Response 200:
  Content-Type:  image/svg+xml
  Cache-Control: public, max-age=300
  X-Content-Type-Options: nosniff
  Body: <svg ...> complete pet card </svg>

Response 200 (user not found):
  Returns a "no pet found" placeholder SVG
  (never 404 — broken <img> tags in READMEs are worse than a placeholder)
```

The response is always 200 with a valid SVG so GitHub Camo never shows a broken image icon.

---

### API — Account

#### `DELETE /api/account`

Permanently deletes the account and all associated data. Requires the user to pass their GitHub username as confirmation to prevent accidental deletion.

```
Auth:     Auth
Body:     { "confirm_username": "string" }

Validation:
  confirm_username must exactly match session user's github_username

Response 200:
  { "deleted": true }
  Clears session cookie

Side effects (all inside one D1 transaction):
  DELETE FROM users WHERE user_id = ?
  -- CASCADE deletes: sessions, pets, trait_tally, activity_log, processed_events

Errors:
  400  confirm_username missing or mismatched
```

---

### Internal — Cron Handlers

Not HTTP routes. Triggered by Cloudflare's `scheduled` event. Defined in the Worker's `scheduled()` export.

```javascript
export default {
  async scheduled(event, env, ctx) {
    switch (event.cron) {
      case "*/30 * * * *": await syncAndDecay(env); break;
      case "0 * * * *":    await cleanup(env);      break;
    }
  }
}
```

#### `syncAndDecay` — every 30 minutes

```
1. SELECT users WHERE last_sync < now - 1800

2. For each user:
   a. GET /users/{username}/events?per_page=100
      Authorization: token {decrypted_token}

   b. Filter events WHERE github_event_id NOT IN processed_events
      AND created_at > user.last_sync

   c. Score each qualifying event (see Interaction Map, §4)
      Apply spam protection rules
      **Apply difficulty multipliers (XP gain, stat gain)**
      Accumulate hunger_delta, happiness_delta, health_delta, xp_delta

   d. Apply decay since last_sync:
        **decay_mult = getDifficultyMult(pet.difficulty)**
        hunger    -= hours_elapsed × 0.4 × decay_mult
        happiness -= hours_elapsed × 0.4 × decay_mult
        health    -= hours_elapsed × 0.4 × decay_mult
        clamp all to [0.0, 100.0]

   e. Update streak:
        if qualifying commit today (UTC date) and streak_last_date = yesterday → streak_current++
        if qualifying commit today and streak_last_date = today → no change
        if no qualifying commit and streak_last_date < yesterday → streak_current = 0
        update streak_longest if streak_current > streak_longest

   f. Check dormant: if hunger=0 AND happiness=0 AND health=0 → set is_dormant=1
      Check revival: if is_dormant=1 AND xp_delta > 0 → set is_dormant=0, apply revival XP bonus

   g. Check stage upgrade (see §5 stage transition table)
      If eligible: increment stage, set trait (from trait_tally if Stage 2)

   h. UPDATE pets (single row)
      INSERT INTO activity_log (one row per scored event + one decay row)
      INSERT INTO processed_events (one row per scored github_event_id)
      UPDATE users.last_sync = now
```

#### `cleanup` — every hour

```
1. DELETE FROM oauth_states    WHERE created_at  < now - 600
2. DELETE FROM sessions        WHERE expires_at  < now
3. DELETE FROM processed_events WHERE processed_at < now - 604800
```

---

### Route Summary

| Method | Path | Auth | Category |
|---|---|---|---|
| GET | `/` | Public | Page |
| GET | `/onboarding` | Auth | Page |
| GET | `/dashboard` | Auth | Page |
| GET | `/u/:username` | Public | Page |
| GET | `/auth/login` | Public | Auth |
| GET | `/auth/callback` | Public | Auth |
| POST | `/auth/logout` | Auth | Auth |
| GET | `/api/me` | Auth | User |
| POST | `/api/pet` | Auth | Pet |
| GET | `/api/pet` | Auth | Pet |
| GET | `/api/activity` | Auth | Pet |
| POST | `/api/pet/retire` | Auth | Pet |
| GET | `/api/hall-of-fame` | Auth | Pet |
| GET | `/api/card/:username` | Public | Card |
| DELETE | `/api/account` | Auth | Account |
| POST | `/api/notifications/seen` | Auth | Notifications |
| — | `syncAndDecay` (cron) | Internal | Cron |
| — | `cleanup` (cron) | Internal | Cron |

---

## 13. SVG Sprite Architecture

The card endpoint (`GET /api/card/:username`) returns a fully self-contained SVG. No external image hosting, no CDN for assets — the entire pet is generated in code inside the Worker.

---

### Approach: JSON Pixel Map → SVG `<rect>` Grid

Each sprite is stored as a JSON file bundled into the Worker at build time. At render time the Worker reads the pixel map, applies health-state color transforms, and emits one `<rect>` per colored pixel.

**Why this over alternatives:**

| Approach | Verdict |
|---|---|
| JSON pixel map → `<rect>` grid | Chosen — human-editable, palette-swappable, no tooling needed |
| SVG `<path>` data | Compact but unreadable; requires external tooling to produce or edit |
| Inline SVG string templates | Flexible but impossible to apply dynamic overlays cleanly |
| `<foreignObject>` (HTML/CSS inside SVG) | Stripped by GitHub's sanitizer — not viable |

---

### Pixel Map Format

Each sprite file is a JSON object. A 20×20 sprite with a 4px render scale produces a 80×80px visual area — readable but not oversized.

```json
{
  "width": 20,
  "height": 20,
  "scale": 4,
  "palette": {
    "0": null,
    "1": "#2d2d2d",
    "2": "#7c5cbf",
    "3": "#f5c542",
    "4": "#ffffff"
  },
  "animations": {
    "idle": {
      "group": "body",
      "keyframes": "0%{transform:translateY(0)} 50%{transform:translateY(-3px)} 100%{transform:translateY(0)}",
      "duration": "1.8s"
    }
  },
  "groups": {
    "body": [[0,1],[0,2]],
    "eyes": [[3,4],[3,5]]
  },
  "frames": {
    "default": [
      [0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,1,2,2,2,2,1,0,0,0,0,0,0,0,0,0,0,0,0],
      "..."
    ]
  }
}
```

**Palette key `"0": null`** means transparent — that pixel is skipped and no `<rect>` is emitted. This keeps the SVG output lean.

**`groups`** map named groups to pixel coordinates as `[row, col]` pairs (0-indexed, top-left origin), allowing CSS animations to target a `<g>` element wrapping only those pixels (e.g. animate only the eyes blinking). Example: `"eyes": [[3,4],[3,5]]` means the pixels at row 3 col 4 and row 3 col 5 belong to the eyes group.

---

### Sprite File Structure

Bundled into the Worker as ES module JSON imports. One file per stage per trait.

```
src/sprites/
  shared/
    dormant.json          used for all traits when is_dormant = true
    placeholder.json      "no pet found" card for unknown usernames
  lone_coder/
    egg.json              stage 0 (all traits share the egg, tinted by trait color)
    hatchling.json        stage 1
    fledgling.json        stage 2
    adult.json            stage 3
    elder.json            stage 4
    legendary.json        stage 5
  collaborator/
    hatchling.json  fledgling.json  adult.json  elder.json  legendary.json
  craftsman/   ...
  architect/   ...
  sprinter/    ...
```

**Egg is shared** — all traits use the same egg sprite, with the trait's dominant color applied as a palette tint. The trait isn't known yet at Stage 0.

Total sprite files: `1 (egg) + 5 traits × 5 stages + 2 shared = 28 files`. Manageable.

---

### Health State as Palette Transform

Rather than separate sprite files per health state, the Worker applies a color transform to the palette at render time. No extra files needed.

| Health State | Transform |
|---|---|
| Healthy | No transform — use palette as-is |
| Hungry | Desaturate all colors by 40% |
| Sad | Shift all colors 15° toward blue-grey |
| Sick | Shift toward green; replace eye-group pixels with `#cc2200` |
| Dormant | Convert all palette colors to greyscale (`luma` formula) |
| Reviving | No transform; add CSS `@keyframes` golden flash on root `<g>` |

Transform is a pure function: `transformPalette(palette, healthState) → newPalette`. Applied before emitting any `<rect>`.

---

### SVG Generation Pipeline

```
GET /api/card/:username
  │
  ├── 1. Read pet from D1
  │         (stage, trait, hunger, happiness, health,
  │          xp, streak_current, name, is_dormant)
  │
  ├── 2. Select sprite file
  │         if is_dormant          → shared/dormant.json
  │         elif stage = 0         → shared/egg.json  (tint with trait color)
  │         else                   → {trait}/{stage_name}.json
  │
  ├── 3. Determine health state (priority order, first match wins)
  │         is_dormant = true              → dormant   (already handled above)
  │         all stats = 0                  → critical
  │         health < 20                    → sick
  │         hunger < 40                    → hungry
  │         happiness < 30                 → sad
  │         all stats ≥ 70                 → healthy
  │         else                           → neutral
  │
  ├── 4. Transform palette
  │         transformPalette(sprite.palette, healthState)
  │
  ├── 5. Render pixel grid
  │         for each [row, col] in sprite.frames.default:
  │           if palette[value] is not null:
  │             emit <rect x={col*scale} y={row*scale}
  │                        width={scale} height={scale}
  │                        fill={palette[value]} />
  │
  ├── 6. Wrap groups in <g> elements
  │         for each group name → wrap matching pixels in <g id={name}>
  │
  ├── 7. Inject animations
  │         emit <style> @keyframes from sprite.animations </style>
  │         attach animation CSS to group <g> elements
  │
  ├── 8. Render card chrome
  │         background rect, stat bars, name, level badge, streak, trait label
  │
  └── 9. Return complete SVG string
            Content-Type: image/svg+xml
            Cache-Control: public, max-age=300
```

---

### Card Chrome Layout (SVG coordinates)

Total viewBox: `0 0 400 160`

```
┌─────────────────────────────────────────────────────────┐  0
│  bg rect fill=#1a1a2e (dark)                            │
│                                                         │
│  ┌──────────────┐  ┌──────────────────────────────────┐ │
│  │              │  │  [name]          [stage badge]   │ │  20
│  │    sprite    │  │                                  │ │
│  │   (80×80)    │  │  Hunger   ████████░░  80%        │ │  55
│  │              │  │  Happy    ██████░░░░  60%        │ │  75
│  │  x=20 y=30   │  │  Health   █████████░  90%        │ │  95
│  │              │  │                                  │ │
│  │  Lv.5  ·  Craftsman  ·  Normal  ·  42d ⚡         │ │  130
│  └──────────────┘  │                                  │ │
│                    └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘  160
  0          120    140                                  400
```

**Stat bars** are `<rect>` pairs: a grey background bar and a colored fill bar whose width is `(stat / 100) * maxBarWidth` (max bar width = 180px). Bar color matches §3 thresholds: `stat ≥ 70` → `#4caf50` (green), `40–69` → `#ff9800` (orange), `< 40` → `#f44336` (red).

---

### GitHub SVG Sanitization Constraints

GitHub's Camo proxy strips certain SVG features. Confirmed safe:

| Feature | Safe? |
|---|---|
| `<rect>`, `<text>`, `<g>`, `<svg>` | Yes |
| `<style>` with `@keyframes` | Yes (simple transforms) |
| `fill`, `stroke` attributes | Yes |
| `transform` attribute | Yes |
| CSS `animation` property | Yes |
| `<foreignObject>` | No — stripped |
| `<script>` | No — stripped |
| External `href` in `<image>` | No — blocked |
| `filter` (blur, saturate) | Partially — avoid for critical visuals |

All palette transforms are done server-side (color values computed in the Worker) — no SVG `filter` needed.

---

## 14. Notification Design

### Goal

Inform users when their pet needs attention, without adding infrastructure cost or registration friction. The motivation loop depends on urgency being felt — but over-notifying kills the experience.

---

### Approach Decision

| Option | Verdict | Reason |
|---|---|---|
| **In-app badge** (derived from pet state) | Primary — ship first | Zero cost, zero infrastructure, no user permission needed |
| **README card visual change** | Already designed | Passive signal visible to the user and anyone viewing their profile |
| **Web Push (browser)** | Optional, defer | Free via VAPID but requires service worker setup; add post-launch |
| **Email** | Skip | Adds registration friction (email field); free tiers limited; not worth it for toy project |

The GitHub profile README card already acts as a passive notification system — when the pet looks sick or hungry, the user sees it every time they view their own profile. This is "free" notification that requires no extra work.

---

### In-App Notification System

Notifications are **derived from pet state at request time** — no separate `notifications` table needed for warning-level alerts. The Worker computes banners when serving `/dashboard` and `/api/me`.

**Positive events** (evolution, streak milestones) are stored in a lightweight `notifications` table so they persist until the user dismisses them.

#### Derived Notifications (stateless, computed on read)

| Trigger condition | Level | Message |
|---|---|---|
| `hunger < 40` | warn | "[name] is getting hungry" |
| `hunger < 20` | urgent | "[name] is starving!" |
| `happiness < 30` | warn | "[name] seems lonely" |
| `health < 25` | urgent | "[name] is sick" |
| `hunger < 20 AND happiness < 20 AND health < 20` | critical | "[name] is about to go dormant" |
| `is_dormant = true` | critical | "[name] has gone dormant — make a commit to revive" |

#### Stored Notifications (positive events, need dismissal)

```sql
CREATE TABLE notifications (
  notification_id  TEXT    PRIMARY KEY,            -- UUID
  user_id          TEXT    NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  type             TEXT    NOT NULL,
    -- 'evolution' | 'streak_milestone' | 'trait_locked' | 'legendary' | 'revival'
  payload          TEXT    NOT NULL,               -- JSON: { "stage": 3 } or { "days": 30 }
  seen             INTEGER NOT NULL DEFAULT 0,     -- 0|1
  created_at       INTEGER NOT NULL
);

CREATE INDEX idx_notifications_user_unseen
  ON notifications(user_id, seen)
  WHERE seen = 0;
```

Notifications are inserted by `syncAndDecay` when it detects a stage transition, trait lock, streak milestone, or revival. They surface on the dashboard as a toast/banner and are marked `seen=1` when the user loads the page.

#### Streak Milestone Triggers

| streak_current | Notification |
|---|---|
| 7 | "7-day streak! [name] is thriving" |
| 30 | "30-day streak! [name] has reached Fledgling maturity" |
| 100 | "100-day streak! [name] is a legend in the making" |
| 365 | "365-day streak! [name] has achieved Legendary status" |

---

### Notification Flow on Dashboard Load

```
GET /dashboard
  │
  ├── fetch pet state from D1
  │
  ├── compute derived notifications (in-memory, no DB read)
  │     urgency level → banner color and message
  │
  ├── SELECT * FROM notifications
  │     WHERE user_id = ? AND seen = 0
  │     ORDER BY created_at DESC
  │
  ├── render dashboard HTML with:
  │     - 0 or 1 derived warning banner (highest urgency only, first match from
  │       priority order: critical > sick > hungry > sad)
  │     - 0–N positive event toasts (unseen stored notifications)
  │
  └── (client JS) POST /api/notifications/seen
        marks all unseen notifications seen=1 after page renders
```

Marking notifications seen happens client-side after render via a fire-and-forget `POST` — not as a side effect of the `GET /dashboard` request, which must remain read-only.

---

### Web Push (Future Enhancement)

Documented here so the path is clear when/if added post-launch.

```
Infrastructure needed:
  - VAPID key pair (generated once, stored in Workers Secrets)
  - push_subscriptions table in D1
  - Service worker JS file served from Cloudflare Pages

New routes:
  POST /api/notifications/subscribe    { endpoint, p256dh, auth }  → store subscription
  DELETE /api/notifications/subscribe  → remove subscription

Cron trigger:
  In syncAndDecay, after setting is_dormant=1:
    → load push_subscriptions for that user
    → send Web Push request to each endpoint (FCM / Mozilla Push Service)
    → message: "[name] has gone dormant! Push a commit to revive."
```

VAPID keys are free to generate (`npx web-push generate-vapid-keys`). The push delivery goes via the browser vendor's push service — no third-party paid service needed.

---

## 15. Open Design Items

All blocking design items are now complete. Remaining items are safe to defer until after the core loop ships.

### Blocking Items — All Done ✓

| Item | Status |
|---|---|
| Full D1 schema | Done ✓ (§11) |
| Complete API route list | Done ✓ (§12) |
| SVG sprite architecture | Done ✓ (§13) |
| Notification design | Done ✓ (§14) |

### Deferred — Implement After Core Loop

| Item | Notes |
|---|---|
| Error & edge case handling | GitHub API down during cron, user revokes OAuth, D1 write failure mid-transaction |
| Social profile page (`/u/:username`) | Route designed; visual layout and content TBD |
| Onboarding copy & pet dialogue | Content only — no architecture impact |
| Web Push notifications | Path documented in §14; zero-cost, add post-launch |
| Monitoring / observability | Cloudflare dashboard covers basics; structured logging can be added to Workers later |
