/**
 * Raga/Tala selection engine — v1 rule-based mapping.
 *
 * Maps (mood, genre) pairs to a Carnatic raga and tala using a curated
 * lookup table. An ML-based raga classifier that infers mood/genre from
 * the lyrics themselves is a documented v2 stretch goal — it is NOT
 * implemented here.
 */

export interface RagaTalaRule {
  mood: string;
  genre: string;
  raga: string;
  tala: string;
  beats: number;
  justification: string;
}

export interface RagaTalaSelection {
  raga: string;
  tala: string;
  justification: string;
}

const RULES: RagaTalaRule[] = [
  {
    mood: "uplifting",
    genre: "devotional",
    raga: "Hamsadhwani",
    tala: "Adi tala",
    beats: 8,
    justification:
      "Hamsadhwani's bright, auspicious pentatonic character suits uplifting devotional texts; Adi tala (8 beats) is the standard cycle for invocatory pieces.",
  },
  {
    mood: "melancholic",
    genre: "devotional-pathos",
    raga: "Sindhubhairavi",
    tala: "Adi tala",
    beats: 8,
    justification:
      "Sindhubhairavi is the classic raga for pathos and emotional appeal (karuna rasa); Adi tala gives the phrasing room to breathe.",
  },
  {
    mood: "pleasant",
    genre: "universal",
    raga: "Mohanam",
    tala: "Rupaka tala",
    beats: 3,
    justification:
      "Mohanam's major-pentatonic sweetness has near-universal appeal; the compact Rupaka tala (3 beats) keeps the feel light and pleasant.",
  },
  {
    mood: "serious",
    genre: "contemplative",
    raga: "Kharaharapriya",
    tala: "Misra Chapu",
    beats: 7,
    justification:
      "Kharaharapriya carries a dignified, contemplative weight; the asymmetric 7-beat Misra Chapu underlines seriousness without heaviness.",
  },
  {
    mood: "romantic",
    genre: "tender",
    raga: "Kalyani",
    tala: "Adi tala",
    beats: 8,
    justification:
      "Kalyani's luminous, expansive sound is the canonical choice for tender and romantic expression; Adi tala supports long melodic arcs.",
  },
  {
    mood: "energetic",
    genre: "triumphant",
    raga: "Nattai",
    tala: "Adi tala",
    beats: 8,
    justification:
      "Nattai's sharp, assertive gamakas project energy and triumph; driving it over Adi tala gives a martial, declarative pulse.",
  },
  {
    mood: "peaceful",
    genre: "meditative",
    raga: "Shanmukhapriya",
    tala: "Rupaka tala",
    beats: 3,
    justification:
      "Shanmukhapriya's introspective colour lends itself to calm, meditative writing; Rupaka tala's gentle 3-beat cycle keeps it unhurried.",
  },
  {
    mood: "nostalgic",
    genre: "longing",
    raga: "Shubhapantuvarali",
    tala: "Khanda Chapu",
    beats: 5,
    justification:
      "Shubhapantuvarali's plaintive intervals evoke nostalgia and longing; the lilting 5-beat Khanda Chapu adds a wistful sway.",
  },
];

const normalize = (s: string) => s.trim().toLowerCase();

const KNOWN_RAGAS = new Set(RULES.map((r) => r.raga.toLowerCase()));

/**
 * Select a raga and tala for a composition.
 *
 * @param mood    Free-form mood string; matched case-insensitively. Unknown
 *                moods fall back to the universal-appeal rule (Mohanam).
 * @param genre   Free-form genre string; combined with mood to find a rule.
 *                If no exact (mood, genre) rule exists, falls back to a
 *                mood-only match, then to the default rule.
 * @param override  Optional raga name supplied by the user. When provided and
 *                recognized, the raga is honored while the tala still comes
 *                from the matched rule. Unknown overrides are ignored.
 */
export function selectRagaTala(
  mood: string,
  genre: string,
  override?: string,
): RagaTalaSelection {
  const m = normalize(mood);
  const g = normalize(genre);

  const rule =
    RULES.find((r) => r.mood === m && r.genre === g) ??
    RULES.find((r) => r.mood === m) ??
    RULES.find((r) => r.genre === g) ??
    // Default: universal-appeal mapping.
    RULES.find((r) => r.raga === "Mohanam")!;

  let raga = rule.raga;
  let justification = rule.justification;
  if (override && KNOWN_RAGAS.has(normalize(override))) {
    raga = RULES.find((r) => r.raga.toLowerCase() === normalize(override))!.raga;
    justification = `User override to ${raga}; ${rule.justification}`;
  }

  return { raga, tala: `${rule.tala} (${rule.beats} beats)`, justification };
}

export const SUPPORTED_RAGAS = RULES.map((r) => r.raga);

export const RAGA_TALA_TABLE = RULES;
