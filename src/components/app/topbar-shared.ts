export const TOPBAR_MENU_ITEM_CLASSNAME = 'rounded-lg cursor-pointer px-3 py-2';
export const TOPBAR_MENU_ITEM_INTERACTIVE_CLASSNAME =
  'rounded-lg cursor-pointer px-3 py-2 data-[highlighted]:bg-muted/80';
export const TOPBAR_MENU_ITEM_DESTRUCTIVE_CLASSNAME =
  'rounded-lg cursor-pointer px-3 py-2 text-destructive focus:text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive';

interface TopbarIdentityInput {
  fullName?: string | null;
  email?: string | null;
}

interface TopbarIdentityOutput {
  displayName: string;
  avatarFallback: string;
}

export function formatTopbarUserIdentity(
  user: TopbarIdentityInput,
  fallbackDisplayName: string,
): TopbarIdentityOutput {
  const displayName =
    user.fullName?.trim() ||
    user.email?.split('@')[0]?.trim() ||
    fallbackDisplayName;

  const avatarFallback =
    displayName.charAt(0).toUpperCase() ||
    user.email?.charAt(0)?.toUpperCase() ||
    'D';

  return { displayName, avatarFallback };
}
