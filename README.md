# RagaForge

Generate Carnatic-inspired music from your lyrics. Pick a mood and genre, and a
rule-based engine selects the raga and tala; a generation service (stubbed for
now) produces the audio. Full-stack Next.js 14 app — one deployable unit on
Vercel's free tier.

## Architecture

| Layer | Choice | Free tier |
|-------|--------|-----------|
| Frontend + API | Next.js 14 App Router (Route Handlers) + TypeScript + Tailwind | Vercel hobby |
| Database | Postgres via Prisma ORM | Neon free tier |
| Auth | BetterAuth — email/password + GitHub OAuth | — |
| Audio storage | Cloudflare R2 (S3-compatible, presigned URLs) | R2 free tier |
| Generation | Stub → will call HF Inference `facebook/musicgen-small` | HF free tier |

```
app/
  page.tsx                 submission form (lyrics, mood, genre, raga override)
  generate/[jobId]/        polls GET /api/jobs/:id every 2s
  gallery/                 public tracks, raga filter, pagination
  login/                   email/password + GitHub sign-in
  api/
    auth/[...all]/         BetterAuth handler
    generate/              POST — create job, run generation
    jobs/[id]/             GET — job status (polling)
    tracks/                GET — public tracks, ?raga= & ?page=
    tracks/[id]/publish/   POST — auth required
    tracks/[id]/like/      POST — auth required
    tracks/[id]/download/  POST — auth required
lib/
  raga-engine/select.ts    v1 rule-based mood/genre -> raga -> tala table
  generation/generateTrack.ts  stub (+ TODO where the HF call goes)
  storage/r2.ts            presigned upload/download helpers
  auth.ts, auth-client.ts, prisma.ts
prisma/schema.prisma       users, sessions, accounts, verifications,
                           generation_jobs, tracks, track_likes
```

## Setup

1. `npm install`
2. Create a free Neon Postgres DB; copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` (Neon pooled connection string)
   - `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), `BETTER_AUTH_URL`
   - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — create an OAuth App at
     https://github.com/settings/developers, callback
     `<BETTER_AUTH_URL>/api/auth/callback/github`
   - R2 credentials (bucket + API token in Cloudflare dashboard)
   - `HF_API_TOKEN` — placeholder only; nothing calls it yet
3. `npx prisma migrate dev --name init`
4. `npm run dev`

## Deploy to Vercel

1. Push this repo to GitHub.
2. Vercel → New Project → import the repo (framework preset: Next.js).
3. Add every var from `.env.example` in Project → Settings → Environment
   Variables (set `BETTER_AUTH_URL` to the production URL).
4. Run `prisma migrate deploy` against the Neon DB (locally or as a one-off).
5. In the GitHub OAuth app, add the production callback
   `https://<app>.vercel.app/api/auth/callback/github`.

## Generation flow

`POST /api/generate` creates a `pending` job, then `generateTrack` runs in the
background (`waitUntil`): it builds a Carnatic prompt (raga, tala beat-cycle,
mood, genre, lyric excerpt), calls HF Inference `facebook/musicgen-small`
(60s timeout, one retry), uploads the WAV to R2, and stores a 7-day presigned
download URL on `generation_jobs.audio_url`. The constructed prompt and any
error are stored on the job row (`prompt`, `error_message`).

## Not yet implemented

- **Waveform player** — gallery uses a plain `<audio>` tag; Wavesurfer.js is
  a next step.
- **Analytics dashboard** — play counts are stored (`play_count`) but there's
  no dashboard UI yet.
- **Permanent audio URLs** — R2 objects are private; `audio_url` is a 7-day
  presigned URL. A public bucket or a download-through API route is a follow-up.
- Background job queue (generation currently runs via `waitUntil` on the
  request's serverless function).
