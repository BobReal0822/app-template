import { Spinner } from '@radix-ui/themes';

// Dashboard-scoped loading UI. Previously this lived at the app root
// (`src/app/loading.tsx`), which created a top-level React Suspense
// boundary that fired whenever ANY upstream layout suspended (locale
// layout's getMessages/getLocale, marketing layout's params, etc.).
// That meant the very first HTML chunk for public pages like /privacy
// and /terms started with a fullscreen spinner — which crawlers and
// Google OAuth Branding verification interpreted as a loading SPA and
// rejected as "improperly formatted".
//
// Scoping the loading boundary to /app keeps the spinner UX where it
// matters (authenticated dashboard with real async data) while letting
// marketing pages render synchronously into the first byte of HTML.
export default function AppLoading() {
  return (
    <div className="flex h-svh w-full items-center justify-center bg-background">
      <div className="rounded-full bg-muted/60 p-4 dark:bg-muted/80">
        <Spinner
          className="text-primary dark:text-primary-foreground"
          size="3"
        />
      </div>
    </div>
  );
}
