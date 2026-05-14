import { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

// Required because `app/not-found.tsx` exists. The real `<html>` / `<body>`
// shell lives in `app/[locale]/layout.tsx` so `lang` matches the route locale
// during static rendering (next-intl: `setRequestLocale` runs after the root
// layout; `getLocale()` in the root was always the default for prerendered
// pages like `/zh/privacy`).
export default function RootLayout({ children }: Props) {
  return children;
}
