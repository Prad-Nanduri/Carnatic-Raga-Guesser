# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Music listeners and Carnatic-music-curious creators (inferred from the product
name and the raga/tala domain); a portfolio-style showcase for visitors who can
browse and play public tracks without an account.

## Product Purpose

RagaForge generates Carnatic-inspired music from user-supplied lyrics. The user
pastes lyrics and picks a mood and genre; a rule-based engine selects the raga
and tala, and a generation service produces the audio. Success is a finished,
shareable track tied to a raga the visitor can understand and browse.

## Positioning

The selection of raga and tala is deterministic and inspectable — a named,
documented rule table — not an opaque model output. The composition parameters
(mood, genre, raga, tala, the constructed generation prompt) stay visible to the
user, which a generic text-to-music tool does not offer.

## Capabilities and Constraints

- Email/password + GitHub OAuth (BetterAuth); gallery browsing and playback are
  intentionally public, while generate/publish/like/download require auth.
- Postgres (Neon) via Prisma; audio files in Cloudflare R2 (private objects,
  presigned URLs).
- Generation calls Hugging Face Inference `facebook/musicgen-small` with a 60s
  timeout and one retry; latency and outcome are recorded in
  `generation_metrics` and surfaced on a public `/dashboard`.
- Free-tier services only — no paid plans anywhere in the stack.

## Brand Commitments

Carnatic / Indian-classical-music cultural identity, expressed with restraint:
deep maroon/oxblood, antique gold, ivory/sandalwood, muted temple-bronze;
kolam-style geometric line work, string/vibration textures, temple-gopuram
silhouette as accents only; serif display with manuscript character paired with
a neutral sans. Explicitly excluded: saffron-to-red gradients, lotus/Om
iconography, gold gradient text, stock "exotic India" imagery, decorative
Indic-script ornament, icon tiles over headings, AI-purple gradients.

## Evidence on Hand

The raga/tala rule table lives at `lib/raga-engine/select.ts` (8 documented
mappings). Real generation metrics live in `generation_metrics` once jobs run;
no invented counts or testimonials exist — the dashboard must show real numbers
or labelled absence, never fabricated stats.
