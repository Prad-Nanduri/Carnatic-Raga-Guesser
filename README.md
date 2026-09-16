# Ragaforge

**Hum a phrase — find the raga.** Ragaforge identifies the closest Carnatic raga to your humming, shows you *why* it thinks so, plays you the scale, and pulls up real alapana performances — then learns from whether its guess was right.

Live: **https://ragaforge.vercel.app**

## Why

Raga identification is a genuinely hard, unsolved-at-scale MIR (music information retrieval) problem — published accuracy numbers come from clean recordings of trained musicians, not phone-mic voice notes. Ragaforge deliberately scopes the problem down: match a hummed phrase against a *curated catalog* of 130+ Carnatic ragas, always present ranked candidates (never a single overconfident answer), and **close the loop with human verdicts** — every "right"/"wrong" click becomes calibration data.

It started as a lyrics→music generation app. Generation got scrapped entirely (the output quality wasn't there); the hum-matcher — the part that actually worked — became the product.

## Features

- **Browser-only pitch pipeline** — hold your Sa for 3s to calibrate, then hum up to 15s. Pitch tracking runs client-side (Pitchy, MPM autocorrelation on an `AnalyserNode`); raw audio never leaves the browser.
- **IDF-weighted matcher** — a tonic-normalized pitch-class histogram is scored against each raga's arohana/avarohana. Swaras are weighted by *inverse catalog frequency* — rare swaras (e.g. prati-madhyama M2) discriminate; near-universal Sa/Pa barely count. Off-scale energy is penalized; a noise floor drops detection jitter.
- **Match evidence, not a black box** — your pitch contour drawn over the candidate raga's swara guide bands, plus per-swara energy bars (in-scale vs off-scale).
- **Verdict loop** — mark the guess right/wrong, say what you actually meant on a miss. Feeds real evaluation data.
- **Scale player** — client-side WebAudio rendering of arohana/avarohana with a Sa drone.
- **Real alapana recordings** — YouTube embeds per raga + instrument (veena/violin/venu/nadaswaram/voice), no API key.
- **Raga explorer** — every raga ever matched with right/wrong tallies.
- **Match analytics dashboard** — overall accuracy, **confidence calibration** (do high-confidence guesses actually hit more?), and a **confusion table** (guessed → meant raga pairs).
- **130+ ragas** — all 72 melakartas (formula-derived and verifiably correct) plus individually cited janyas from the karnatik.com reference.

## Architecture

```
┌───────────────────────────── Browser ─────────────────────────────┐
│  Mic ─▶ Pitchy (MPM pitch track, AudioContext)                     │
│         │  calibrate Sa (3s) ─▶ phrase (≤15s)                      │
│         ▼                                                         │
│  semitone track ─▶ 12-bin pitch-class histogram (Sa = pc 0)        │
│         │                                                         │
│         ▼                                                         │
│  matcher.ts: IDF-weighted coverage vs each raga's scale            │
│         │                                                         │
│         ▼  top-3 candidates (raga, confidence) — user picks         │
└─────────┼─────────────────────────────────────────────────────────┘
          │  POST /api/matches {raga, confidence}
          │  PATCH /api/matches/:id {verdict, confirmedRaga?}
          ▼
┌──────────────────────── Next.js (App Router) ─────────────────────┐
│  /api/matches    create + judge matches (BetterAuth session opt.)  │
│  /api/stats      per-raga aggregates for explorer + analytics      │
│  /api/recordings YouTube search scrape → embed video IDs (1h cache)│
│  pages: / (hum flow) · /gallery (explorer) · /dashboard (analytics)│
└──────────────────────────┬────────────────────────────────────────┘
                           │ Prisma
                           ▼
                    ┌──────────────┐
                    │ Neon Postgres│  users · sessions · hum_matches
                    │  (serverless)│  (+ legacy generation tables)
                    └──────────────┘
```

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router, TS) | server + client in one free deploy |
| Styling | Tailwind + custom design tokens | Carnatic identity: ivory/sandalwood, oxblood, antique gold; Fraunces + Source Sans 3 |
| Pitch | [Pitchy](https://github.com/ianprime0509/pitchy) | MPM autocorrelation, ESM, zero server cost |
| DB / ORM | Neon Postgres + Prisma | serverless, free tier |
| Auth | BetterAuth (email/password; GitHub OAuth optional) | self-hosted, no vendor lock |
| Recordings | YouTube search scrape + `youtube-nocookie` embeds | real performances, no API key/quota |

## The matcher, honestly

This is a **similarity scorer, not a raga classifier**. It's transparent about limits:

- It only ever returns ragas from the curated catalog — never a free-text guess.
- Confidence = IDF-weighted on-scale energy share; it reports *relative* fit, not truth.
- The verdict loop turns user corrections into measurable accuracy/calibration data — visible on the dashboard.

## Known limits & roadmap

- Pitch-class histograms ignore **temporal structure** — two ragas with identical swara sets but different phrase grammar can't be separated yet. A pitch-transition (bigram) model is the natural next step.
- No gamaka handling — sustained oscillation between swaras smears into both bins; vibrato-aware binning or a hidden-Markov contour model would help.
- Melakarta↔janya ambiguity: a phrase using only a janya's swaras always also matches its parent melakarta. Scale-coverage priors could down-weight supersets.
- Cold-start noise: the 3s Sa calibration assumes the user holds pitch steadily.

## Development

```bash
npm install
cp .env.example .env.local   # DATABASE_URL, BETTER_AUTH_SECRET at minimum
npx prisma migrate deploy
npm run dev
```

Env vars: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, optional `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` (the login button auto-hides when unset).

## License

MIT — see [LICENSE](LICENSE).
