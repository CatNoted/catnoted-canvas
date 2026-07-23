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
