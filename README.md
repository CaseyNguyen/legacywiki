# LegacyWiki

A Wikipedia-style encyclopedia for a Sleeper fantasy football league, with a few Sleeper touches (navy masthead, team-colored bands, position pills, a bottom tab bar on phones).

Paste a league link and LegacyWiki walks the league back to its first season, then writes:

- **Legacy standings** (the default view) and a year switcher for any single season
- **An article per team**: a Claude-written story, a team-colored infobox, logo palette, home/away/alternate uniforms, season-by-season table, points-per-game chart, Hall of Fame, start/sit record, head-to-head table and trades
- **Season pages** with standings, winners and consolation brackets, weekly results and season leaders
- **Head-to-head** and **legacy comparison** pages for any two teams
- **Championship history**, a season-by-season playoff grid, all-time records, rivalries (most-played matchups), league records and a ranked **list of trades**

A fictional **demo league** (`/league/demo`) works offline, so you can try everything without a league.

## Run it

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY for AI-written stories (optional)
npm run dev                  # http://localhost:3000
```

Production: `npm run build && npm start`. Requires Node 20.9+.

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Enables Claude-written team stories. Without it, each team gets a summary built from its stats. |
| `LEGACYWIKI_STORY_MODEL` | Story model, default `claude-sonnet-5-5`. |
| `LEGACYWIKI_AI_DAILY_CALL_LIMIT` | Max story calls per day (default 50). `0` turns the limit off. |
| `LEGACYWIKI_AI_MONTHLY_CALL_LIMIT` | Max story calls per month (default 300). |
| `LEGACYWIKI_AI_MONTHLY_TOKEN_LIMIT` | Max tokens per month (default 1,500,000). |
| `LEGACYWIKI_TIMEZONE` | Time zone for the daily and monthly reset (default `America/Los_Angeles`). |
| `LEGACYWIKI_CACHE_DIR` | Where caches live. Default `./.legacywiki-cache` (`/tmp/legacywiki-cache` on Vercel). |
| `SLEEPER_API_BASE` | Override the Sleeper API base URL (handy for testing against a mock). |

## How the call budgets are met

| Requirement | Implementation |
|---|---|
| 1 story call per team | Stories are stored permanently under the league's first-season id + team id. Concurrent requests share one in-flight call; repeat visits never call again. A failed call shows the stats summary and offers **Try again** (only failures can be retried). |
| Capped spending on your key | Every call reserves a slot against the daily call, monthly call and monthly token limits (`src/lib/ai-budget.ts`), stored on disk so they survive restarts. When a limit is reached, or Anthropic reports the account is out of credits, the key is rejected or the API is down, writing pauses and pages show the stats summary. That summary isn't stored, so the real article is written on a later visit once writing is available again. Rejected calls give their slot back because they aren't billed. |
| ≤ 1 player-data call per day | `/players/nfl` is trimmed to name/position/eligibility and cached in memory and on disk for 24 h; concurrent requests share one download, and a failed refresh keeps serving the old copy. |
| < 200 ms for every other endpoint | Pages and JSON endpoints only read a precomputed league model (memory first, then disk). Typical times are 2–10 ms; every response carries a `Server-Timing` header. |
| ≤ 1 palette call per team | Each logo is downloaded and analyzed once, keyed by logo URL, and stored permanently. |
| No repeat database calls | Completed seasons never change, so their Sleeper responses are stored permanently. Only the in-progress season is refetched (at most every 30 minutes, in the background, while the cached model keeps serving). Identical in-flight requests are collapsed and Sleeper traffic is capped at 10 concurrent requests. |

Check it on a running server:

```bash
npm run perf -- demo http://localhost:3000      # or your league id
```

This times every JSON endpoint against the 200 ms budget and prints the call counters (`/api/health`).

The first visit to a new league is the one slow step: it downloads every season from Sleeper (roughly 40 requests per season) while a progress screen is shown. After that, everything is served from cache.

## Definitions

**Legacy Score** (weights in `src/lib/model/legacy.ts`): championship +100, runner-up +45, third place +20, playoff appearance +20, playoff win +10, best regular-season record +15, most points for +10, regular-season win +3 (ties +1.5), last place −15.

**Start/sit success rate**: for every lineup slot in every game that counted (regular season, plus playoff and consolation weeks the team played), the starter is compared with the best bench player eligible for that slot (FLEX, SUPER_FLEX and IDP slots respected). Correct when the starter scored at least as much; slots with no eligible bench player are skipped. Bench = roster − starters.

**Trade value**: points each received player scored *in the receiving team's starting lineup* from the trade week until he left that roster (across seasons for keeper and dynasty leagues). Trades are ranked by the gap between sides. Draft picks and FAAB are listed but not valued.

**Hall of Fame**: best single season at each position and each season's team MVP, counting starter points only.

**Rivalries**: team pairs ranked by meetings (regular season + postseason), then by how close the series is.

**Brackets**: champion, runner-up and third come from the winners bracket (`p = 1` and `p = 3` games); playoff appearances are every team in the winners bracket.

## API

All responses are JSON with a `Server-Timing` header. League endpoints answer `202` with build progress if the league isn't built yet.

| Method & path | Returns |
|---|---|
| `POST /api/league` `{ "input": "<link or id>" }` | Validates the league and starts the one-time build |
| `GET /api/league/:id/status` | Build progress |
| `GET /api/league/:id` | League summary, teams, Legacy standings |
| `GET /api/league/:id/standings[?season=YYYY]` | Legacy or season standings |
| `GET /api/league/:id/teams/:teamId` | Team article data |
| `GET /api/league/:id/seasons/:season` | Season standings, brackets, weekly results, trades |
| `GET /api/league/:id/h2h?a=&b=` | Head-to-head series and game log |
| `GET /api/league/:id/compare?a=&b=` | Legacy comparison |
| `GET /api/league/:id/trades[?season=&team=]` | Trades ranked by value |
| `GET|POST /api/league/:id/stories/:teamId` | Team story (`202` while it's being written; `POST {"retry":true}` retries a failure) |
| `GET /api/players[?id=]` | Player cache status, or one player |
| `GET /api/health` | Call counters |

## Layout

```
src/lib/sleeper/   Sleeper client (live.ts), daily player cache, demo league
src/lib/model/     build.ts (fetch every season), compute.ts (all statistics), legacy.ts (weights)
src/lib/           league.ts (build/cache lifecycle), story.ts (Claude), palette.ts (logo colors), views.ts
src/app/           pages (overview, teams, team, seasons, season, h2h, compare, trades) and /api routes
src/components/    wiki chrome, uniforms, charts, client islands (TOC, sorting, pickers, stories)
```

## Deploy to Render

LegacyWiki needs one long-lived server with a persistent disk (the caches and the AI usage counters live there). Render's cheapest paid plan does this for about $7.25/month ($7 instance + 1 GB disk at $0.25/GB); the free plan can't attach a disk.

1. **Put the code on GitHub.** Create a private repo and push this folder with git (`git init`, `git add .`, `git commit`, `git push`). Use git rather than GitHub's web upload: the web upload ignores `.gitignore` and would publish `.env.local` if it exists.
2. **Create the service.** In Render, choose **New → Blueprint**, connect the repo, and Render reads `render.yaml`: a Node web service in Oregon, a 1 GB disk at `/data`, the build and start commands, the health check and the spending limits.
3. **Add your key.** Render asks for `ANTHROPIC_API_KEY` during setup. It's stored in Render's environment settings, never in the repo. You can change it later under **Environment**.
4. **Deploy.** The first build takes a few minutes. Open the `onrender.com` URL, paste your league link, and wait for the one-time build.
5. **Check spending** at `/api/health` (`aiBudget` shows calls, tokens and an estimated cost for the month). Adjust the limits under **Environment**; changes apply on the next deploy.

Also give the key's workspace a monthly spend limit in the Anthropic Console. The app's limits stop it from calling; the Console limit is the hard backstop if anything else uses the key.

Pushes to the repo redeploy automatically. With a disk attached, each deploy has a few seconds of downtime, and the service can't scale to more than one instance. If you later need several instances or a serverless host such as Vercel, move the store in `src/lib/store.ts` to shared storage (Redis/KV or a database); it's one small module with `get`/`set`/`delete`.

Sleeper data is used under its public, read-only API (non-commercial use; keep traffic under ~1,000 requests a minute).
