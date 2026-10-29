/**
 * Generated portraits (docs/ASSET-INVENTORY.md): the ten trainers and the five walkthrough
 * personas. Paths are served by the client from client/public.
 */
export const trainerPortrait = (code: string) => `/images/generated/trainers/${code}.webp`

const PERSONA_CODES = new Set(['L0001', 'L0002', 'L0003', 'L0004', 'L0005'])

/** The persona's portrait, or null for every other seeded learner (initials are shown). */
export const personaPortrait = (learnerCode: string) =>
  PERSONA_CODES.has(learnerCode) ? `/images/generated/personas/${learnerCode}.webp` : null
