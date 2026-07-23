## Autonomous Loop

- Jules dispatch: open Issue with labels `ready` + `jules`, or comment `@jules`.
- Jules PR must include closing keyword: `Closes #<issue>`, `Fixes #<issue>`, or `Resolves #<issue>`.
- Auto-merge workflow: `auto-merge.yml` waits for green CI, squash merge, and branch cleanup.
- Auto-close workflow: `close-issues-on-merge.yml` closes referenced issues after merge.
- Stale cleanup: `stale.yml` removes inactive issues/PRs after 9 days total.
- Dispatch verification: Verified successfully on July 22, 2026. The test runner and autonomous dispatch are fully operational.

## Real-Time Collaboration (Yjs & Supabase)

- Real-time collaboration is enabled for the tldraw canvas using Yjs and Supabase Realtime.
- `CollabProvider` (in `src/lib/collaboration/context.tsx`) manages the `Y.Doc` and connects local-first persistence using `y-indexeddb`.
- When Supabase environment variables are configured, `CollabProvider` subscribes to a Supabase Realtime Channel (`board-collab:${boardId}`) and uses Broadcast to synchronize Yjs document updates via a custom two-step sync protocol.
- Client presence and active connections are tracked using Supabase Realtime Presence.
- Cursors are broadcasted with high-frequency over Supabase Broadcast and rendered in the local tldraw canvas using custom `instance_presence` records in the `editor.store`. Offline or disconnected peer cursors are cleaned up immediately via Presence sync events or after 5 seconds of inactivity.

## Shared Session / Subdomain SSO (Supabase)

- Single Sign-On (SSO) between catnoted (the document editor) and catnoted-canvas is achieved via a shared parent/apex domain cookie setup.
- To configure this setup:
  1. Both apps must be hosted under subdomains of the same parent domain (e.g. app.catnoted.com and canvas.catnoted.com, or catnoted.app and canvas.catnoted.app).
  2. Set the `NEXT_PUBLIC_COOKIE_DOMAIN` environment variable to the shared parent domain (e.g., `.catnoted.app` or `.catnoted.com`). Note the leading dot.
  3. Set the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the same Supabase project across both applications.
- This ensures that cookies written by either app are automatically shared and validated across both.
- When `NEXT_PUBLIC_COOKIE_DOMAIN` is omitted, the client defaults to localhost-friendly scoping (standard subdomain cookies).
- Fallback remains fully functional. If the Supabase instance is offline or credentials are not supplied, the canvas operates local-first using IndexedDB.
- The auth callback `/api/auth/callback` handles token exchange and redirects securely using a `next` query parameter. It is protected against open-redirect vulnerabilities.
