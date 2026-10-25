// Service URLs were shortened (migration 0089). Old links keep working: the
// service page looks a slug up under every name it has had and redirects to the
// current one, and built-in content / form layouts are keyed by the canonical
// (new) slug so they apply both before and after the database rename.
export const SERVICE_SLUG_RENAMES: Record<string, string> = {
  presentation: 'research-proposal',
  'idea-to-research-proposal-conversion-pac-548ho': 'proposal-and-analysis',
  'complete-preparation-and-submission-of-c-z45nq': 'clinicaltrials-registration',
}

/** The current (short) slug for any old or new slug. */
export function canonicalServiceSlug(slug: string): string {
  return SERVICE_SLUG_RENAMES[slug] ?? slug
}

/** Every slug a service may be stored under: the given one, its canonical
 * form, and any old names that map to it. */
export function serviceSlugCandidates(slug: string): string[] {
  const canonical = canonicalServiceSlug(slug)
  const olds = Object.keys(SERVICE_SLUG_RENAMES).filter((k) => SERVICE_SLUG_RENAMES[k] === canonical)
  return [...new Set([slug, canonical, ...olds])]
}
