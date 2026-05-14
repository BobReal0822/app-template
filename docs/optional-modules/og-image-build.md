# Build-time OG images

Use when: you want pre-rendered, byte-stable OG images for every static
marketing route (vs. the runtime `/api/og` route which Vercel re-renders
per request and is harder to verify against social previewers).

## What was dropped

The original `scripts/build-og-images.ts` walked the marketing route
table, called the runtime `/api/og` renderer with `?key=<route>`, and
wrote the PNGs to `public/share/og/<key>-v2.png` (gitignored). The
`prebuild` script ran it before `next build`.

## Re-introduce

1. Add the script back as `scripts/build-og-images.ts`.
2. Add the script to `package.json`:

   ```json
   {
     "scripts": {
       "build:og": "tsx scripts/build-og-images.ts",
       "prebuild": "pnpm run build:og"
     }
   }
   ```

3. Tell Next.js to bundle the fonts + base rasters used by `/api/og` into
   the deployed lambda — already wired in the runtime route. If you
   change the renderer, update the `outputFileTracingIncludes` block in
   `next.config.js`:

   ```js
   outputFileTracingIncludes: {
     '/api/og': [
       './src/app/api/og/_fonts/**/*',
       './public/share/og/*.jpg',
       './public/share/og/*.png',
     ],
   },
   ```

4. Make sure the keys in `src/app/api/og/_config.ts` match
   `MARKETING_OG_IMAGE_KEYS` in
   `src/app/[locale]/(marketing)/_shared/seo.ts`.

## Notes

- Font files (`_fonts/*.ttf`) are required for the satori renderer at
  request time; they are not in `node_modules`.
- The `*-v2.png` outputs are intentionally gitignored — regenerate them
  in CI or as a `prebuild` hook.
