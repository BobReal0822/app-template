// import BaseLayout from '@/components/BaseLayout';
// import NotFoundPage from '@/components/NotFoundPage';
// import { routing } from '@/i18n/routing';

import { redirect } from 'next/navigation';

// This page renders when a route like `/unknown.txt` is requested.
// In this case, the layout at `app/[locale]/layout.tsx` receives
// an invalid value as the `[locale]` param and calls `notFound()`.

export default function GlobalNotFound() {
  // 重定向到默认语言的 404 页面
  redirect('/404');
}
