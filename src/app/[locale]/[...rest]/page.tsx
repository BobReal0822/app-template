import { redirect } from 'next/navigation';

// export default function CatchAllPage() {
//   notFound();
// }

import { pathnameWithLocale } from '@/i18n/routing';

export default async function CatchAllPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // console.info(' in 404 CatchAllPage');
  redirect(pathnameWithLocale(locale, '/404'));
}
