/**
 * Wire-format DTO barrel.
 *
 * The canonical contract between Vercel handlers / SSR pages and frontend
 * consumers.
 * See `./README.md` for conventions and layer boundaries.
 *
 * **Frontend usage** — `import type` only. Values (the `*RowToDto` helpers)
 * are server-side; pulling them into a client bundle would tree-shake to
 * nothing in practice but signals layer confusion.
 */

export * from './feedback.js';
export * from './credit-grant.js';
