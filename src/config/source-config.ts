/**
 * Video source display configuration (Source Badge)
 * Icons use local paths, consistent with the video-analysis list page.
 */

export interface SourceConfigItem {
  icon: string;
  labelKey: SourceKey;
  color: string;
}

/** Local icon path prefix (consistent with video-analysis/page) */
const ICON_PREFIX = '/cm/icons';

export const SOURCE_KEYS = [
  'upload',
  'local',
  'tiktok',
  'youtube',
  'douyin',
  'other',
] as const;

export type SourceKey = (typeof SOURCE_KEYS)[number];

export const SOURCE_CONFIG: Record<SourceKey, SourceConfigItem> = {
  upload: {
    icon: '',
    labelKey: 'upload',
    color: 'bg-muted text-foreground',
  },
  /** page-to-optimize uses 'local', synonymous with upload */
  local: {
    icon: '',
    labelKey: 'local',
    color: 'bg-muted text-foreground',
  },
  tiktok: {
    icon: `${ICON_PREFIX}/tiktok.ico`,
    labelKey: 'tiktok',
    color: 'bg-black text-white',
  },
  youtube: {
    icon: `${ICON_PREFIX}/youtube.ico`,
    labelKey: 'youtube',
    color: 'bg-red-500 text-white',
  },
  douyin: {
    icon: `${ICON_PREFIX}/douyin.ico`,
    labelKey: 'douyin',
    color: 'bg-[#161823] text-white',
  },
  other: {
    icon: '',
    labelKey: 'other',
    color: 'bg-muted text-foreground',
  },
};

export function getSourceConfig(sourceKey: string): SourceConfigItem {
  const key = (SOURCE_KEYS as readonly string[]).includes(sourceKey)
    ? (sourceKey as SourceKey)
    : 'other';
  return SOURCE_CONFIG[key];
}
