# POP OKDEGEN — v1

A Popcat-style OkDegen clicker with:

- supplied OkDegen background, logo and character art
- Normal → ClickReaction swap on press
- POP.mp3 on each press
- per-tab score counter
- mute toggle
- X and OpenSea links
- Top 10 leaderboard modal
- nickname submission (max 16 characters)
- Cloudflare Pages Functions + D1 backend
- local-browser fallback leaderboard for visual testing before Cloudflare is configured
- basic server-side impossible-score / submission-rate checks

## Fast visual test (no Cloudflare required)

From this folder:

```bash
npm run preview:static
```

Then open `http://localhost:8788`.

The clicker works immediately. Since the API is not running, the leaderboard displays **LOCAL DEMO** and stores test entries only in that browser.

## Turn on the real shared leaderboard

Cloudflare Pages Functions need a D1 database binding.

1. Install dependencies:

```bash
npm install
```

2. Log in to Cloudflare Wrangler:

```bash
npx wrangler login
```

3. Create the D1 database:

```bash
npx wrangler d1 create okdegen-leaderboard
```

Copy the `database_id` returned by Cloudflare.

4. Copy `wrangler.toml.example` to `wrangler.toml`, then replace `PASTE_YOUR_D1_DATABASE_ID_HERE` with that ID.

5. Create the tables remotely:

```bash
npx wrangler d1 execute okdegen-leaderboard --remote --file=./schema.sql
```

6. Create the Pages project named `popokdegen` if it does not already exist, then deploy from this folder:

```bash
npm run deploy
```

Cloudflare will give the project a `*.pages.dev` URL. If `popokdegen` is available as the project name, the intended address is:

`https://popokdegen.pages.dev`

## Local testing with Pages Functions

After `wrangler.toml` is configured, run:

```bash
npm run dev
```

Wrangler serves the static site and the `/api/*` Pages Functions together. D1 local/remote behavior depends on your Wrangler binding settings, so use Cloudflare's current Wrangler prompts/configuration if it asks how to provision the binding.

## Leaderboard rules in v1

- Top 10, all time.
- Names: 1–16 ASCII letters/numbers/spaces plus `_ . -`.
- A name keeps only its highest submitted score.
- No account or wallet connection.
- Basic anti-cheat rejects scores that are impossible relative to the server-issued session start time (currently a generous 20 clicks/sec + 40-click burst allowance).
- This is deterrence, not tournament-grade cheat prevention. A determined user can still automate clicks at plausible rates.

## Files

- `public/` — site and supplied media assets
- `functions/api/` — server endpoints
- `schema.sql` — D1 database schema
- `wrangler.toml.example` — Cloudflare binding template

## Later upgrades

Good next additions: Cloudflare Turnstile on score submission, daily/weekly boards, wallet-linked names, global total pops, admin score removal, and stronger anti-bot logic.
