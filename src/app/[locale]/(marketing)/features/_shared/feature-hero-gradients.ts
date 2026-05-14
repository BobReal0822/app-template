export interface FeatureHeroGradientPreset {
  section: string;
  /** Gradient color tokens only — no positioning classes. */
  glowColor: string;
  /** Optional top offset for the orb (e.g. '-top-24'). Defaults to 'top-0'. */
  glowTop?: string;
  /** Optional left offset for the orb (e.g. 'left-[46%]'). Defaults to 'left-1/2'. */
  glowLeft?: string;
  /** Solid text color for emphasized headline spans (WCAG-friendly; no bg-clip-text). */
  highlight: string;
}

/**
 * Decorative background orb. Capped size + blur-2xl (vs 1000px + blur-3xl) cuts GPU compositing
 * cost while the soft gradient read stays similar.
 *
 * Position and color are split into separate preset fields so they don't produce conflicting
 * Tailwind classes on the same element.
 */
export function featureHeroGlowOrbClassName(
  preset: FeatureHeroGradientPreset,
): string {
  const top = preset.glowTop ?? 'top-0';
  const left = preset.glowLeft ?? 'left-1/2';
  const translate = preset.glowLeft ? '' : '-translate-x-1/2';
  return `absolute ${top} ${left} h-[min(90vw,520px)] w-[min(90vw,520px)] ${translate} rounded-full ${preset.glowColor} blur-2xl`.trim();
}

/**
 * Feature marketing heroes:
 * - Keep calm SaaS parity with home/pricing shells
 * - Differentiate hue by feature intent (input, analysis, photo, video)
 * - Keep visual focus near top viewport (hero is tall and lower half is mostly preview media)
 */
export const FEATURE_HERO_GRADIENTS = {
  urlToVideo: {
    section:
      'bg-linear-to-b from-primary/7 via-chart-2/3 to-background dark:from-primary/16 dark:via-chart-2/8 dark:to-background',
    glowColor:
      'bg-linear-to-br from-primary/18 via-primary/10 to-chart-2/8 dark:from-primary/34 dark:via-primary/20 dark:to-chart-2/16',
    glowTop: '-top-24',
    highlight: 'text-primary',
  },
  videoInsight: {
    section:
      'bg-linear-to-b from-chart-2/7 via-primary/3 to-background dark:from-chart-2/14 dark:via-primary/8 dark:to-background',
    glowColor:
      'bg-linear-to-br from-chart-2/14 via-primary/8 to-primary/5 dark:from-chart-2/28 dark:via-primary/16 dark:to-primary/10',
    glowTop: '-top-28',
    glowLeft: 'left-[46%]',
    highlight: 'text-primary',
  },
  productPhoto: {
    section:
      'bg-linear-to-b from-chart-3/5 via-chart-3/2 to-background dark:from-chart-3/16 dark:via-chart-3/8 dark:to-background',
    glowColor:
      'bg-linear-to-br from-chart-3/14 via-chart-3/8 to-primary/3 dark:from-chart-3/34 dark:via-chart-3/20 dark:to-primary/12',
    glowTop: '-top-24',
    glowLeft: 'left-[54%]',
    highlight: 'text-primary',
  },
  productVideo: {
    section:
      'bg-linear-to-b from-chart-5/6 via-primary/3 to-background dark:from-chart-5/13 dark:via-primary/8 dark:to-background',
    glowColor:
      'bg-linear-to-br from-chart-5/14 via-primary/10 to-primary/6 dark:from-chart-5/26 dark:via-primary/20 dark:to-primary/12',
    glowTop: '-top-30',
    highlight: 'text-primary',
  },
} satisfies Record<string, FeatureHeroGradientPreset>;
