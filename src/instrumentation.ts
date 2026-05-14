/**
 * Next.js instrumentation hook.
 *
 * `register()` runs in **every** runtime that the app uses (Node.js + Edge,
 * because we have `next-intl` middleware on Edge). To keep Node-only
 * auth/runtime dependencies out of the Edge bundle, we dispatch to a
 * runtime-specific module via dynamic import. Webpack will still trace the
 * dynamic specifier, but the Edge import graph stops at this file because
 * the path is gated on `NEXT_RUNTIME` and the imported module never appears
 * on the Edge side.
 *
 * Edge runs middleware only; Node loads `instrumentation-node` for server hooks.
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation-node');
  }
}
