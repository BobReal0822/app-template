// Public surface of the `@app/db` workspace package.
//
// Consumers (the Next.js app under `src/` and repo scripts/tests) should
// import from the package root or a sub-path:
//
//   import { getDbHttp, withUserScope } from '@app/db'
//   import { users, projects } from '@app/db/schema'
//
// Sub-path exports stay stable across schema additions; the root barrel is
// the convenience surface for shared application logic.

export * from './client';
export * from './authz';
export * from './credits';
export * as schema from './schema';
