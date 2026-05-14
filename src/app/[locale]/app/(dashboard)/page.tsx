import { HomeBanner } from './_components/home-banner';

export default function AppPage() {
  return (
    <div className="space-y-8 pt-3 pb-6 px-4">
      <HomeBanner />

      {/*
        Add your dashboard surface here:
          - feature/launch cards
          - server-fetched recent activity
          - usage stats / credit balance widgets
      */}
    </div>
  );
}
