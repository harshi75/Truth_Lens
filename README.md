# TruthLens

A misinformation triage platform — the tool a newsroom or citizen group would
use to triage viral claims quickly. Neutral by design: it checks information,
not ideologies.

**Hackathon ID:** `AZIS-U744FH`

## Track

Track 2: Real-World AI Products — Brief: TruthLens (misinformation triage).

## Stack

- **Backend:** Node.js + Express
- **Database:** SQLite via `better-sqlite3` 
- **Frontend:** Vanilla HTML/CSS/JavaScript, served statically by Express (no build step)
- No authentication — every feature is reachable without creating an account, per the submission requirements.

## Features implemented

1. **Submit a claim** — text, source platform (WhatsApp/X/Instagram/Other), category (Politics/Health/Finance/Other), optional source link.
2. **Risk flags** — computed automatically on submission:
   - Contains "breaking" / "shocking" / "share before deleted" → `Sensational`
   - More than 50% of the claim's letters are uppercase → `Shouting`
   - No source link provided → `Unsourced`
   - 2 or more flags → overall `High Risk`
3. **Review workflow** — move a claim from `Unverified` to `Verified True` / `Verified False` / `Misleading`, with a required short note.
4. **Public feed** — all claims with status badges, filterable by category and status.
5. **Detail view** — full claim text, its flags, the reviewer's note, and submission time.

See `DECISIONS.md` for how the three open Decision Points were resolved.

## Run it locally

```bash
git clone <this-repo-url>
cd truthlens
npm install
node seed.js      # optional: adds 3 sample claims for demo purposes
npm start
```




| Method | Path                       | Purpose                          |
|--------|----------------------------|-----------------------------------|
| GET    | `/api/meta`                | Platforms/categories/statuses    |
| GET    | `/api/claims`              | List claims (`?category=&status=`)|
| POST   | `/api/claims`              | Submit a claim                   |
| GET    | `/api/claims/:id`          | Claim detail                     |
| PATCH  | `/api/claims/:id/review`   | Set review status + note         |
| GET    | `/api/claims/export.csv`  | Export current filtered feed as CSV (extra) |
| GET    | `/api/stats`               | Dashboard counts by risk/status/category/platform (extra) |

## Project structure

```
truthlens/
├── server.js       # Express app + API routes
├── db.js           # SQLite connection + schema
├── riskFlags.js     # Flag/risk-level computation (Decision Point-adjacent logic)
├── seed.js          # Optional sample-data script
├── public/          # Static frontend (index.html, app.js, style.css)
└── DECISIONS.md      # Write-up of the 3 Decision Points
```
