# TODO

- [ ] Confirm source of `SELF_SIGNED_CERT_IN_CHAIN` error by adding logging around DB connection/startup.
- [ ] Fix Postgres TLS trust for the Aiven `DATABASE_URL`.
  - [ ] Preferred: provide CA bundle / SSL options in `server/src/db.ts` (postgres client config).
  - [ ] Fallback dev-only: relax `sslmode` in `.ENV` from `verify-full` to `require` (or `verify-ca`) to confirm diagnosis.
- [ ] Re-run server to verify error is resolved.

