import {
  Clapperboard,
  ImagePlus,
  Link2,
  MonitorPlay,
  ShoppingBag,
  Telescope,
  type LucideIcon,
} from 'lucide-react';

/**
 * Minimal feature registry:
 * - Keep only shared base metadata (id/route/icon)
 * - Keep project-type mapping needed by business logic
 */
export type FeatureId =
  | 'urlToVideo'
  | 'productVideo'
  | 'productPhoto'
  | 'videoGenerator'
  | 'imageGenerator'
  | 'videoAnalysis';
type OutputKind = 'image' | 'video';

// Raw project.type values from backend/database.
export type ProjectType =
  | 'url-to-video'
  | 'product-video'
  | 'product-photo'
  | 'gen-video'
  | 'gen-image';

export interface FeatureMeta {
  id: FeatureId;
  route: string;
  icon: LucideIcon;
}

// Source of truth for shared base feature info. All app features live under /app/*.
export const FEATURES: Record<FeatureId, FeatureMeta> = {
  urlToVideo: {
    id: 'urlToVideo',
    route: '/app/url-to-video',
    icon: Link2,
  },
  productVideo: {
    id: 'productVideo',
    route: '/app/product-video',
    icon: Clapperboard,
  },
  productPhoto: {
    id: 'productPhoto',
    route: '/app/product-photo',
    icon: ShoppingBag,
  },
  videoGenerator: {
    id: 'videoGenerator',
    route: '/app/video-generator',
    icon: MonitorPlay,
  },
  imageGenerator: {
    id: 'imageGenerator',
    route: '/app/image-generator',
    icon: ImagePlus,
  },
  videoAnalysis: {
    id: 'videoAnalysis',
    route: '/app/video-insight',
    icon: Telescope,
  },
};

/**
 * ProjectType -> Feature mapping for:
 * - draft workflow redirect
 * - project card fallback icon
 * - download extension inference (image/video)
 */
const PROJECT_TYPE_CONFIG = {
  'url-to-video': {
    featureId: 'urlToVideo',
    outputKind: 'video',
    draftWorkflowRoute: '/app/url-to-video',
  },
  'product-video': {
    featureId: 'productVideo',
    outputKind: 'video',
  },
  'product-photo': {
    featureId: 'productPhoto',
    outputKind: 'image',
  },
  'gen-video': {
    featureId: 'videoGenerator',
    outputKind: 'video',
  },
  'gen-image': {
    featureId: 'imageGenerator',
    outputKind: 'image',
  },
} as const satisfies Record<
  ProjectType,
  {
    featureId: FeatureId;
    outputKind: OutputKind;
    draftWorkflowRoute?: string;
  }
>;

export type ProjectTypeFeatureId =
  (typeof PROJECT_TYPE_CONFIG)[ProjectType]['featureId'];

export function getFeatureById(id: FeatureId): FeatureMeta {
  return FEATURES[id];
}

export function getFeatureByRoute(pathname: string): FeatureMeta | null {
  // Match the most specific route first.
  const entries = Object.values(FEATURES).sort(
    (a, b) => b.route.length - a.route.length,
  );
  for (const feature of entries) {
    if (
      pathname === feature.route ||
      pathname.startsWith(`${feature.route}/`)
    ) {
      return feature;
    }
  }
  return null;
}

export function getFeatureIdByProjectType(
  projectType?: string | null,
): FeatureId | null {
  if (!projectType) return null;
  return PROJECT_TYPE_CONFIG[projectType as ProjectType]?.featureId ?? null;
}

export function getFeatureByProjectType(
  projectType?: string | null,
): FeatureMeta | null {
  const id = getFeatureIdByProjectType(projectType);
  return id ? FEATURES[id] : null;
}

export function getProjectDraftWorkflowRoute(
  projectType?: string | null,
): string | null {
  if (!projectType) return null;
  const config = PROJECT_TYPE_CONFIG[projectType as ProjectType];
  if (!config) return null;
  return 'draftWorkflowRoute' in config ? config.draftWorkflowRoute : null;
}

export function isImageProjectType(projectType?: string | null): boolean {
  if (!projectType) return false;
  return (
    PROJECT_TYPE_CONFIG[projectType as ProjectType]?.outputKind === 'image'
  );
}
