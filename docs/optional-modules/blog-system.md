# Blog system

Use when: you want an MDX-driven `/blog` index + post pages served from
the same Next.js app (good for SEO landing pages, changelogs, growth
content).

## Install

```bash
pnpm add next-mdx-remote remark-gfm rehype-slug gray-matter reading-time github-slugger
```

## File layout

```
content/
└── blog/
    ├── en/
    │   └── 2026-05-launch.mdx   # frontmatter: title, date, summary, ogImage
    └── zh/
        └── 2026-05-launch.mdx
```

Each MDX file owns its frontmatter; the loader (`src/lib/blog.ts`) reads
the directory tree and builds the route table at request time.

## Wire into the App Router

```
src/app/[locale]/(marketing)/blog/
├── page.tsx              # index — list all posts for the locale
├── [slug]/page.tsx       # individual post — MDX → React
└── layout.tsx            # optional — typography wrapper
```

The original `src/lib/blog.ts` exported `getAllPosts(locale)` and
`parseBlogCalendarDate(...)`. Re-introduce it when you add the
`content/blog/` tree.

## Sitemap

Re-add the blog branch in `src/app/sitemap.ts`:

```ts
import { getAllPosts, parseBlogCalendarDate } from '@/lib/blog';

const [enPosts, zhPosts] = await Promise.all([
  getAllPosts('en'),
  getAllPosts('zh'),
]);
// …append entries for /blog/<slug> and /zh/blog/<slug>
```

## Marketing OG keys

Add `'blog'` back to `MARKETING_OG_IMAGE_KEYS` in
`src/app/[locale]/(marketing)/_shared/seo.ts` and create the OG content
in `src/app/api/og/_config.ts`.

## Cache headers

`src/middleware.ts` ships a marketing CDN cache header for
`about|features|feedback|pricing|privacy|terms`. Add `blog` to
`CACHEABLE_MARKETING_SEGMENTS` and the `next.config.js` `headers()`
patterns when you turn the route on.
