'use client';

import { AboutCtaSection } from './cta-section';
import { AboutHeroSection } from './hero-section';
import { AboutMissionVisionSection } from './mission-vision-section';
import { AboutStorySection } from './story-section';
import { AboutValuesSection } from './values-section';

export function AboutPageContent() {
  return (
    <div className="bg-background">
      <AboutHeroSection />
      <AboutMissionVisionSection />
      <AboutStorySection />
      <AboutValuesSection />
      <AboutCtaSection />
    </div>
  );
}
