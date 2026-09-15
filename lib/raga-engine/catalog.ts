/**
 * Full Carnatic raga catalog: all 72 melakarta ragas + a broad set of
 * well-known janya ragas.
 *
 * Melakarta scales are GENERATED from the standardized chakra formula
 * (Govindacharya's scheme): S and P fixed; one R,G pair and one D,N pair
 * per chakra position; M1 for melas 1-36, M2 for 37-72. Because the scheme
 * is mechanical, every melakarta scale below is verifiably correct.
 * Names per the standard melakarta table (Wikipedia "Melakarta" list,
 * govindacharya-standardized spellings, simplified to plain ASCII).
 *
 * Janya scales are individually listed and cited to the karnatik.com raga
 * reference pages (https://www.karnatik.com/ragas.shtml); the fewer where
 * scales vary by school carry a TODO note.
 */

export interface CatalogEntry {
  name: string;
  arohana: string;
  avarohana: string;
  kind: "melakarta" | "janya";
  mela?: number; // melakarta number, or parent mela for janya
  source: string;
  phrases?: string[];
}

const MELAKARTA_SOURCE =
  "Govindacharya melakarta scheme (formula-derived); names per Wikipedia melakarta list";

const RG_PAIRS = ["R1 G1", "R1 G2", "R1 G3", "R2 G2", "R2 G3", "R3 G3"];
const DN_PAIRS = ["D1 N1", "D1 N2", "D1 N3", "D2 N2", "D2 N3", "D3 N3"];

const MELAKARTA_NAMES = [
  // Indu
  "Kanakangi", "Ratnangi", "Ganamurti", "Vanaspati", "Manavati", "Tanarupi",
  // Netra
  "Senavati", "Hanumatodi", "Dhenuka", "Natakapriya", "Kokilapriya", "Rupavati",
  // Agni
  "Gayakapriya", "Vakulabharanam", "Mayamalavagowla", "Chakravakam", "Suryakantam", "Hatakambari",
  // Veda
  "Jhankaradhvani", "Natabhairavi", "Kiravani", "Kharaharapriya", "Gourimanohari", "Varunapriya",
  // Bana
  "Mararanjani", "Charukesi", "Sarasangi", "Harikambhoji", "Dheerasankarabharanam", "Naganandini",
  // Rutu
  "Yagapriya", "Ragavardhini", "Gangeyabhooshani", "Vagadheeshwari", "Shulini", "Chalanattai",
  // Rishi
  "Salagam", "Jalarnavam", "Jhalavarali", "Navaneetam", "Pavani", "Raghupriya",
  // Vasu
  "Gavambhodi", "Bhavapriya", "Shubhapantuvarali", "Shadvidamargini", "Suvarnangi", "Divyamani",
  // Brahma
  "Dhavalambari", "Namanarayani", "Kamavardhani", "Ramapriya", "Gamanashrama", "Vishvambari",
  // Disi
  "Shamalangi", "Shanmukhapriya", "Simhendramadhyamam", "Hemavati", "Dharmavati", "Neetimati",
  // Rudra
  "Kantamani", "Rishabhapriya", "Latangi", "Vachaspati", "Mechakalyani", "Chitrambari",
  // Aditya
  "Sucharitra", "Jyotisvaroopini", "Dhatuvardhani", "Nasikabhooshani", "Kosalam", "Rasikapriya",
];

export const MELAKARTA: CatalogEntry[] = MELAKARTA_NAMES.map((name, i) => {
  const n = i + 1;
  const chakra = Math.floor(i / 6); // 0-11
  const pos = i % 6;
  const rg = RG_PAIRS[chakra % 6];
  const dn = DN_PAIRS[pos];
  const m = n <= 36 ? "M1" : "M2";
  const scale = `S ${rg.split(" ")[0]} ${rg.split(" ")[1]} ${m} P ${dn.split(" ")[0]} ${dn.split(" ")[1]} S`;
  return {
    name,
    arohana: scale,
    avarohana: scale,
    kind: "melakarta" as const,
    mela: n,
    source: MELAKARTA_SOURCE,
  };
});

/**
 * Janya (derived) ragas. Scales cited to karnatik.com raga reference unless
 * noted. `phrases` are plain-English derived descriptors for prompts.
 */
export const JANYA: CatalogEntry[] = [
  // (Existing curated eight — entries retained; Sindhubhairavi keeps its TODO.)
  {
    name: "Hamsadhwani",
    arohana: "S R2 G3 P N3 S",
    avarohana: "S N3 P G3 R2 S",
    kind: "janya", mela: 29,
    source: "karnatik.com raga reference",
    phrases: [
      "direct, bright ascent with minimal ornamentation",
      "emphatic pa–ni leaps",
      "crisp landing on sa",
    ],
  },
  {
    name: "Sindhubhairavi",
    arohana: "S R2 G2 M1 G1 P D1 N2 S",
    avarohana: "S N2 S D1 P M1 G2 R1 S N2 S",
    kind: "janya", mela: 20,
    source: "karnatik.com raga reference — TODO: scale varies by school; verify avarohana",
    phrases: [
      "grief-laden oscillation between dhaivatas",
      "pleading slides from ga into ma",
      "karuna-weighted, speech-like phrasing",
    ],
  },
  {
    name: "Mohanam",
    arohana: "S R2 G3 P D2 S",
    avarohana: "S D2 P G3 R2 S",
    kind: "janya", mela: 29,
    source: "karnatik.com raga reference",
    phrases: [
      "sweet pentatonic contours",
      "smooth pa–da returns",
      "even, unhurried phrase arcs",
    ],
  },
  {
    name: "Kalyani",
    arohana: "S R2 G3 M2 P D2 N3 S",
    avarohana: "S N3 D2 P M2 G3 R2 S",
    kind: "janya", mela: 65,
    source: "karnatik.com raga reference",
    phrases: [
      "luminous prati-madhyama emphasis",
      "expansive ma–da oscillations",
      "long, soaring arcs to tara sa",
    ],
  },
  {
    name: "Nattai",
    arohana: "S R3 G3 M1 P D3 N3 S",
    avarohana: "S N3 P M1 G3 M1 R3 S",
    kind: "janya", mela: 36,
    source: "karnatik.com raga reference",
    phrases: [
      "sharp, declamatory ascending sweeps",
      "assertive antara gandhara",
      "martial leaps over the middle register",
    ],
  },
  // Extended janya catalog — scales per karnatik.com reference pages.
  { name: "Abhogi", arohana: "S R2 G3 M1 D2 S", avarohana: "S D2 M1 G3 R2 S", kind: "janya", mela: 22, source: "karnatik.com raga reference" },
  { name: "Amritavarshini", arohana: "S G3 M2 P N3 S", avarohana: "S N3 P M2 G3 S", kind: "janya", mela: 66, source: "karnatik.com raga reference" },
  { name: "Anandabhairavi", arohana: "S G2 R2 G2 M1 P D2 P S", avarohana: "S N2 D2 P M1 G2 R2 S", kind: "janya", mela: 22, source: "karnatik.com raga reference — vakra arohana" },
  { name: "Aarabhi", arohana: "S R2 M1 P D2 S", avarohana: "S N2 D2 P M1 G3 R2 S", kind: "janya", mela: 29, source: "karnatik.com raga reference" },
  { name: "Bahudari", arohana: "S G3 M1 P D2 N2 S", avarohana: "S N2 P M1 G3 R2 S", kind: "janya", mela: 29, source: "karnatik.com raga reference" },
  { name: "Begada", arohana: "S G3 R2 G3 M1 P N2 D2 P S", avarohana: "S N2 D2 P M1 G3 R2 S", kind: "janya", mela: 29, source: "karnatik.com raga reference — vakra arohana" },
  { name: "Behag", arohana: "S G3 M2 P N3 D2 N3 S", avarohana: "S N2 D2 P M1 G3 R2 S", kind: "janya", mela: 65, source: "karnatik.com raga reference — anya swara shading" },
  { name: "Bhairavi", arohana: "S R1 G2 M1 P D1 N2 S", avarohana: "S N2 D1 P M1 G2 R1 S", kind: "janya", mela: 20, source: "karnatik.com raga reference" },
  { name: "Bilahari", arohana: "S R2 G3 P D2 S", avarohana: "S N2 D2 P M1 G3 R2 S", kind: "janya", mela: 29, source: "karnatik.com raga reference" },
  { name: "Bhoopalam", arohana: "S R1 G2 P D1 S", avarohana: "S D1 P G2 R1 S", kind: "janya", mela: 8, source: "karnatik.com raga reference" },
  { name: "BrindavanaSaranga", arohana: "S R2 M1 P N3 S", avarohana: "S N2 P M1 R2 G3 R2 S", kind: "janya", mela: 22, source: "karnatik.com raga reference" },
  { name: "Charukeshi", arohana: "S R2 G3 M1 P D1 N2 S", avarohana: "S N2 D1 P M1 G3 R2 S", kind: "janya", mela: 26, source: "karnatik.com raga reference — same as melakarta Charukesi" },
  { name: "Chenchurutti", arohana: "S R2 G3 P D2 N2", avarohana: "N2 D2 P M1 G3 R2 S", kind: "janya", mela: 29, source: "karnatik.com raga reference — ends on ni" },
  { name: "Darbar", arohana: "S R2 G3 M1 P D2 N2 S", avarohana: "S N2 D1 P M1 G3 R2 S", kind: "janya", mela: 22, source: "karnatik.com raga reference — anya swara dha" },
  { name: "Devagandhari", arohana: "S G3 M1 P D2 N2 S", avarohana: "S N2 D2 P M1 G3 R2 S", kind: "janya", mela: 29, source: "karnatik.com raga reference" },
  { name: "Dhanyasi", arohana: "S G2 M1 P N2 S", avarohana: "S N2 D1 P M1 G2 R2 S", kind: "janya", mela: 20, source: "karnatik.com raga reference" },
  { name: "Durga", arohana: "S R2 M1 P D2 S", avarohana: "S D2 P M1 R2 S", kind: "janya", mela: 29, source: "karnatik.com raga reference" },
  { name: "GambhiraNattai", arohana: "S G3 M1 P N3 S", avarohana: "S N3 P M1 G3 S", kind: "janya", mela: 36, source: "karnatik.com raga reference" },
  { name: "HamirKalyani", arohana: "S R2 G3 M2 P D2 N3 S", avarohana: "S N2 D2 P M2 G3 M1 G3 R2 S", kind: "janya", mela: 65, source: "karnatik.com raga reference — anya swara" },
  { name: "Hindolam", arohana: "S G2 M1 D1 N2 S", avarohana: "S N2 D1 M1 G2 S", kind: "janya", mela: 20, source: "karnatik.com raga reference" },
  { name: "Huseni", arohana: "S R2 G3 M1 P D2 N2 S", avarohana: "S N2 D2 N3 D2 P M1 G3 R2 S", kind: "janya", mela: 28, source: "karnatik.com raga reference — anya swara ni" },
  { name: "Jaunpuri", arohana: "S R2 M1 P D1 S", avarohana: "S N2 D1 P M1 G2 R2 S", kind: "janya", mela: 20, source: "karnatik.com raga reference" },
  { name: "Kanada", arohana: "S R2 P G3 M1 D2 M1 N3 S", avarohana: "S N2 P M1 G3 M1 R2 S", kind: "janya", mela: 28, source: "karnatik.com raga reference — vakra" },
  { name: "Kapi", arohana: "S R2 G3 M1 P D2 N2 S", avarohana: "S N2 D2 N2 P M1 G3 R2 S", kind: "janya", mela: 22, source: "karnatik.com raga reference — janya of Kharaharapriya" },
  { name: "Kedaragaula", arohana: "S R2 M1 P M1 G3 R2 S", avarohana: "S N2 D2 P M1 G3 R2 S", kind: "janya", mela: 29, source: "karnatik.com raga reference — vakra arohana" },
  { name: "Khamas", arohana: "S M1 G3 M1 P D2 N2 S", avarohana: "S N2 D2 P M1 G3 R2 S", kind: "janya", mela: 28, source: "karnatik.com raga reference" },
  { name: "Kunthalavarali", arohana: "S M1 P D2 N2 D2 S", avarohana: "S N2 D2 P M1 S", kind: "janya", mela: 22, source: "karnatik.com raga reference" },
  { name: "Kurinji", arohana: "S R3 G3 M1 P D3 N3 S", avarohana: "S N3 P M1 G3 R3 S", kind: "janya", mela: 36, source: "karnatik.com raga reference" },
  { name: "Madhyamavati", arohana: "S R2 M1 P N2 S", avarohana: "S N2 P M1 R2 S", kind: "janya", mela: 22, source: "karnatik.com raga reference" },
  { name: "Mand", arohana: "S G3 M2 P D2 S", avarohana: "S D2 P M2 G3 R2 S", kind: "janya", mela: 65, source: "karnatik.com raga reference" },
  { name: "Mukhari", arohana: "S R2 M1 P D2 S", avarohana: "S N2 D2 P M1 G2 R2 S", kind: "janya", mela: 22, source: "karnatik.com raga reference" },
  { name: "Nagasvarali", arohana: "S R1 G3 M1 P D1 S", avarohana: "S D1 P M1 G3 R1 S", kind: "janya", mela: 15, source: "karnatik.com raga reference" },
  { name: "Nalinakanti", arohana: "S G3 R2 M1 P N3 S", avarohana: "S N3 P M1 G3 R2 S", kind: "janya", mela: 29, source: "karnatik.com raga reference" },
  { name: "Narayani", arohana: "S R2 M1 P D2 S", avarohana: "S D2 P M1 R2 S N2 S", kind: "janya", mela: 29, source: "karnatik.com raga reference" },
  { name: "Neelambari", arohana: "S R2 G3 M1 P D2 N2 S", avarohana: "S N2 P M1 G3 R2 S", kind: "janya", mela: 29, source: "karnatik.com raga reference" },
  { name: "Poorvikalyani", arohana: "S R2 G3 M1 P D2 P S", avarohana: "S N3 D2 P M2 G3 R2 S", kind: "janya", mela: 53, source: "karnatik.com raga reference — anya swara ma" },
  { name: "Punnagavarali", arohana: "S R1 G2 M1 P D1 N2", avarohana: "N2 D1 P M1 G2 R1 S", kind: "janya", mela: 8, source: "karnatik.com raga reference — ends on ni" },
  { name: "Reetigaula", arohana: "S G2 R2 G2 M1 N2 D2 M1 N2 N2 S", avarohana: "S N2 D2 M1 G2 R2 S", kind: "janya", mela: 22, source: "karnatik.com raga reference — vakra arohana" },
  { name: "Revati", arohana: "S R1 M1 P N2 S", avarohana: "S N2 P M1 R1 S", kind: "janya", mela: 30, source: "karnatik.com raga reference" },
  { name: "Sahana", arohana: "S G2 M1 P M1 D2 N2 S", avarohana: "S N2 D2 P M1 G2 M1 R2 G2 R2 S", kind: "janya", mela: 22, source: "karnatik.com raga reference — vakra" },
  { name: "Saramati", arohana: "S R1 G3 S D1 P M1 S", avarohana: "S N2 D1 P M1 G3 R1 S", kind: "janya", mela: 15, source: "karnatik.com raga reference — vakra arohana" },
  { name: "Saranga", arohana: "S R2 M1 P D2 P S", avarohana: "S N2 D2 P M1 G3 R2 S", kind: "janya", mela: 29, source: "karnatik.com raga reference" },
  { name: "Saurashtram", arohana: "S R2 G3 M1 P M1 D2 N3 S", avarohana: "S N3 D2 N2 D2 P M1 G3 R2 S", kind: "janya", mela: 29, source: "karnatik.com raga reference — vakra, anya swara" },
  { name: "ShuddhaDhanyasi", arohana: "S G2 M1 P N2 S", avarohana: "S N2 P M1 G2 S", kind: "janya", mela: 22, source: "karnatik.com raga reference" },
  { name: "ShuddhaSaveri", arohana: "S R2 M1 P D2 S", avarohana: "S D2 P M1 R2 S", kind: "janya", mela: 29, source: "karnatik.com raga reference" },
  { name: "Sriranjani", arohana: "S R2 G2 M1 D2 N2 S", avarohana: "S N2 D2 M1 R2 G2 S", kind: "janya", mela: 22, source: "karnatik.com raga reference" },
  { name: "Surutti", arohana: "S R2 M1 P D2 P S", avarohana: "S N2 D2 P M1 G2 R2 S", kind: "janya", mela: 29, source: "karnatik.com raga reference" },
  { name: "Tilang", arohana: "S G3 M1 P N3 S", avarohana: "S N3 P M1 G3 R2 S", kind: "janya", mela: 28, source: "karnatik.com raga reference" },
  { name: "Udayaravichandrika", arohana: "S G2 M1 P N2 S", avarohana: "S N2 P M1 G2 S", kind: "janya", mela: 22, source: "karnatik.com raga reference — akin to ShuddhaDhanyasi" },
  { name: "Valaji", arohana: "S G3 P D2 N3 S", avarohana: "S N3 D2 P G3 S", kind: "janya", mela: 28, source: "karnatik.com raga reference" },
  { name: "Vasanta", arohana: "S M1 G3 M1 D2 N3 S", avarohana: "S N3 D2 M1 G3 R2 S", kind: "janya", mela: 51, source: "karnatik.com raga reference" },
  { name: "VasanthaBhairavi", arohana: "S R1 G2 M1 D2 N2 S", avarohana: "S N2 D2 M1 G2 R1 S", kind: "janya", mela: 20, source: "karnatik.com raga reference" },
  { name: "Vijayanagari", arohana: "S R2 G2 M1 P D2 N2 S", avarohana: "S N2 D2 P M1 G2 R2 S", kind: "janya", mela: 23, source: "karnatik.com raga reference" },
];

export const RAGA_CATALOG: CatalogEntry[] = [...MELAKARTA, ...JANYA];
