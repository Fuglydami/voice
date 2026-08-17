/**
 * Test-time stand-in for the `server-only` package.
 *
 * `server-only` deliberately throws when it is resolved through a client
 * condition, which is exactly what makes it a useful guard in the app — and
 * exactly what breaks a Vitest run that imports a server module directly. The
 * guard still holds where it matters: Next.js resolves the real package during
 * `next build`, so a client import of `lib/env` remains a build error.
 */
export {};
