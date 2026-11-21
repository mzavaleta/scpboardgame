/**
 * The canonical Spanish glossary (B5).
 *
 * A build artifact, not prose: three sources of Spanish text (the ES branch,
 * authored content, authored chrome) otherwise produce three vocabularies within
 * a week. The validator rejects the banned synonyms below; it does not police
 * style.
 */

export type GlossaryEntry = {
  readonly term: string;
  readonly canonical: string;
  readonly banned: readonly string[];
};

export const GLOSSARY: readonly GlossaryEntry[] = [
  { term: "containment", canonical: "contención", banned: ["encerramiento", "contenimiento"] },
  { term: "breach", canonical: "brecha", banned: ["breach", "fisura"] },
  { term: "clearance level", canonical: "acceso", banned: ["clearance", "autorización"] },
  { term: "anomalous entity", canonical: "anomalía", banned: ["anomalia", "entidad anómala"] },
  { term: "directive", canonical: "directriz", banned: ["directiva", "mandato"] },
  { term: "Fate point", canonical: "Destino", banned: ["punto de destino", "suerte"] },
];
