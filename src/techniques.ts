import { TECHS as upstreamTechniques } from './vendor/sudokui/ratings';
import type { Step as UpstreamStep } from './vendor/sudokui/steps';

// App-wide extensions keep the vendored sudokUI catalogue unchanged.
export const TECHS = {
  ...upstreamTechniques,
  PALINDROME_LOCKED_CANDIDATES: {
    name: 'Palindrome locked candidates', score: 50, level: 'Medium' as const,
    category: 'Palindromes', index: 4001, implemented: true, enabled: true,
  },
  PHISTOMEFEL_RING: {
    name: 'Phistomefel Ring', score: 200, level: 'Hard' as const,
    category: 'Set equivalence', index: 4000, implemented: true, enabled: true,
  },
};
export type Tech = keyof typeof TECHS;
export type Step = Omit<UpstreamStep, 'tech'> & { tech: Tech };
