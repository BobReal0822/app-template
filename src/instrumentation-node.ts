/**
 * Node-runtime-only instrumentation, invoked from `src/instrumentation.ts`.
 *
 * Better-Auth does not require explicit startup warm-up at this time.
 */
export async function warmupAuth(): Promise<void> {
  return;
}

void warmupAuth();
