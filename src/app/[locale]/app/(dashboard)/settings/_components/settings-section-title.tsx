import type { ReactNode } from 'react';

import type { LucideIcon } from 'lucide-react';

const SETTINGS_SECTION_TITLE_ICON_CLASSNAME =
  'h-4 w-4 shrink-0 text-muted-foreground';
const SETTINGS_SECTION_TITLE_CLASSNAME =
  'inline-flex items-center gap-2 text-base';

interface SettingsSectionTitleProps {
  icon: LucideIcon;
  children: ReactNode;
}

export function SettingsSectionTitle({
  icon: Icon,
  children,
}: SettingsSectionTitleProps) {
  return (
    <span className={SETTINGS_SECTION_TITLE_CLASSNAME}>
      <Icon className={SETTINGS_SECTION_TITLE_ICON_CLASSNAME} aria-hidden />
      {children}
    </span>
  );
}
