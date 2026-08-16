# WETH DEGEN — OkDegen Clicker

A Popcat-style browser clicker built around the OkDegen NFT artwork.

Live site:

https://popokdegen.pages.dev

Click the Degen. Stack WETH'D. Unlock achievements. Climb the leaderboard.

---

## Features

### Core Clicker

- Normal → clicked OkDegen image swap on press
- Pop sound on accepted clicks
- Mouse, touch and keyboard support
- Current run score resets to `0` when the page is refreshed
- Responsive desktop and mobile layout
- Sound On / Off toggle

### Easter Eggs

- `69`, `6969`, `696969`, etc. trigger **Nice!**
- Exactly `420` triggers **Blaze It!**
- Special 420 idle and clicked artwork
- Character returns to the normal artwork after 420

### Combo System

Rapid clicking builds a visual combo.

- Combo appears starting at `x25`
- Continues `x26`, `x27`, `x28`, etc.
- Resets after roughly 800ms without an accepted click
- Combo is visual only and does not multiply the WETH'D score

### My Stats

Stored locally in the player's browser:

- Personal Best
- Highest Combo

These survive normal page refreshes.

### Achievements

There are currently 15 achievements:

| # | Achievement | Requirement |
|---|---|---:|
| 1 | First WETH | 1 |
| 2 | NICE! | 69 |
| 3 | WETH Noob | 200 |
| 4 | WETH Blazer | 420 |
| 5 | WETH Rookie | 1,000 |
| 6 | WETH Chad | 2,500 |
| 7 | WETH Lord | 5,000 |
| 8 | WETH GOD | 7,500 |
| 9 | Certified WETH'ER | 10,000 |
| 10 | Ultimate WETH'ER | 100,000 |
| 11 | Max WETH'ER | 250,000 |
| 12 | Titan WETH'ER | 500,000 |
| 13 | Holy WETH | 750,000 |
| 14 | King WETH | 1,000,000 |
| 15 | Absolute Degen | 6,696,696 |

Unlocked achievements are stored locally in the player's browser and display an achievement-unlocked popup.

---

## Leaderboard

The shared leaderboard is powered by Cloudflare Pages Functions and Cloudflare D1.

Current rules:

- Top 10 scores
- Nicknames are limited to 16 characters
- Allowed nickname characters:
  - letters
  - numbers
  - spaces
  - `_`
  - `.`
  - `-`
- Each nickname keeps only its highest score
- No wallet or account connection is required
- Leaderboard submissions use the server-verified score stored in D1
- The browser-provided score is not trusted

The leaderboard also displays:

- GLOBAL WETH'D
- Share Your Score to X button

---

## GLOBAL WETH'D

GLOBAL WETH'D is stored in Cloudflare D1.

The public endpoint:

```text
GET /api/global
```

is read-only.

The browser cannot directly increase the global total.

GLOBAL WETH'D increases only after a click batch has been accepted by:

```text
POST /api/clicks
```

This means the global counter uses the same verified click flow as the leaderboard score.

---

## Anti-Cheat System

WETHDEGEN uses several layers of anti-cheat protection.

### Browser-side protections

- Minimum accepted click interval of 80ms
- Synthetic/untrusted browser events are rejected
- Suspicious click timing patterns are monitored
- 100-click pattern window
- Highly consistent rapid clicking can trigger a DEGEN CHECK

### DEGEN CHECK

The player receives up to three strikes.

**Strike 1**

> Are you using an auto clicker Degen? 😉

**Strike 2**

> Tsk Tsk Degen, You should stop using that auto clicker. Last Warning. 😈

**Strike 3**

> You know, I thought you were better than this Degen... 😢

On the third strike, the punishment system:

- clears the current run
- clears Personal Best
- clears Highest Combo
- clears local achievements
- removes the leaderboard score owned by that server session
- removes the server session
- reloads the game

GLOBAL WETH'D is intentionally not reduced by punishment.

### Server-authoritative score

The browser's visible score is not considered authoritative.

Accepted clicks are sent to Cloudflare in small batches.

Cloudflare maintains its own:

```text
server_score
```

inside the player's D1 session.

When a leaderboard score is submitted, `/api/submit` ignores any browser score and reads the verified `server_score` directly from D1.

For example:

```text
Browser modified with DevTools:
6,696,696

Verified D1 server score:
247

Leaderboard submission:
247
```

### Verified click batches

Each server click batch includes:

- session ID
- number of clicks
- sequence number

A batch may contain at most 10 clicks.

Server protections include:

- server-issued sessions
- sequential batch numbers
- replay protection
- duplicate network-retry protection
- D1 row-change verification
- total-session click-rate validation
- per-batch timing validation
- leaderboard submission rate limiting

These protections make simple DevTools score editing and direct score submission ineffective.

A determined programmer could still automate actions at a sufficiently human-like permitted rate. This system is intended as strong protection for a public browser clicker, not tournament-grade proof that every click came from a physical human.

---

## Project Structure

```text
public/
  index.html
  app.js
  styles.css
  assets/

functions/
  api/
    session.js
    clicks.js
    leaderboard.js
    submit.js
    global.js
    punish.js
    scorecard.js
    score-text.js

schema.sql
package.json
wrangler.toml.example
README.md
```

### Main files

`public/index.html`

Main game UI, menu, leaderboard, achievements, stats and anti-cheat dialog markup.

`public/app.js`

Main frontend game logic including clicking, combos, achievements, stats, audio, server syncing and leaderboard interaction.

`public/styles.css`

Desktop/mobile styling and animations.

`functions/api/session.js`

Creates server-side player sessions.

`functions/api/clicks.js`

Validates click batches and updates the authoritative server score and GLOBAL WETH'D.

`functions/api/leaderboard.js`

Returns the shared leaderboard.

`functions/api/submit.js`

Submits the D1-verified score to the leaderboard.

`functions/api/global.js`

Read-only GLOBAL WETH'D endpoint.

`functions/api/punish.js`

Deletes the offending session's leaderboard entry and server session after the third DEGEN CHECK strike.

`schema.sql`

Complete Cloudflare D1 database schema.

---

## Cloudflare D1

Database name:

```text
okdegen-leaderboard
```

Pages Function binding:

```text
DB
```

The database contains three main tables.

### `scores`

Stores leaderboard highscores.

Important fields include:

```text
name_key
display_name
score
updated_at
owner_session_id
```

### `sessions`

Stores server-side game sessions and verified scores.

Important fields include:

```text
id
started_at
last_submit_at
submitted_score
server_score
batch_seq
last_batch_at
```

### `global_stats`

Stores GLOBAL WETH'D.

```text
id
total
```

---

## Local Installation

Install dependencies:

```bash
npm install
```

Log in to Cloudflare Wrangler:

```bash
npx wrangler login
```

Create the D1 database if one does not already exist:

```bash
npx wrangler d1 create okdegen-leaderboard
```

Copy:

```text
wrangler.toml.example
```

to:

```text
wrangler.toml
```

Then replace:

```text
PASTE_YOUR_D1_DATABASE_ID_HERE
```

with the real D1 database ID.

Create the database tables:

```bash
npx wrangler d1 execute okdegen-leaderboard --remote --file=./schema.sql
```

---

## Local Testing

### Static frontend only

```bash
npm run preview:static
```

Then open:

```text
http://localhost:8788
```

Without the Pages Functions backend, leaderboard behavior falls back to local browser testing where supported.

### Pages Functions + frontend

After configuring Wrangler:

```bash
npm run dev
```

This runs the static site and `/api/*` Pages Functions together.

---

## Deployment

The production project is hosted on Cloudflare Pages.

Project name:

```text
popokdegen
```

Production URL:

```text
https://popokdegen.pages.dev
```

The GitHub repository is connected to Cloudflare Pages, so commits to the production branch automatically trigger a deployment.

A manual Wrangler deployment is also available through:

```bash
npm run deploy
```

---

## Useful D1 Admin Commands

### Clear leaderboard

```sql
DELETE FROM scores;
```

### Clear leaderboard and sessions

```sql
DELETE FROM scores;
DELETE FROM sessions;
```

### Reset GLOBAL WETH'D

```sql
UPDATE global_stats
SET total = 0
WHERE id = 1;
```

Use these commands carefully on the production database.

---

## Social Links

X:

https://x.com/okdegen

OpenSea:

https://opensea.io/collection/ok-degen-799266709

---

## Experimental Scorecard

The repository currently contains:

```text
functions/api/scorecard.js
functions/api/score-text.js
public/assets/scorecard-template.jpg
```

These were created while testing a dynamic X scorecard system.

The dynamic image-compositing version is currently parked. The existing score sharing button uses X's normal share intent and works independently of this experimental feature.

---

## Security Notes

Never treat values supplied by frontend JavaScript as trusted.

The shared leaderboard should continue to use the D1 `server_score` as its authoritative value.

Any future score-related feature should flow through server-side validation before affecting:

- leaderboard rankings
- GLOBAL WETH'D
- shared statistics

Client-side protections are useful deterrents, but server-side validation is the security boundary.
