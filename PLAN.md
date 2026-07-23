# Plan - catnoted-canvas

Phased delivery. Each phase is independently shippable. Status emojis: TODO, IN PROGRESS, DONE.

## Phase 1 - MVP: local-first canvas
Goal: a working offline canvas with sticky notes, free text, and drawing, saved in the browser.

- [x] Scaffold Next.js (App Router) + TypeScript strict + Tailwind. (shadcn/ui deferred until UI grows; minimal UI built with Tailwind.)
- [x] Apply terminal-retro design tokens (void/amber/paper/moss).
- [x] Install and mount tldraw canvas.
- [x] Enable native shapes: sticky note, text, free draw (tldraw defaults).
- [x] Persist active board to IndexedDB (load on open, debounced save).
- [x] Board manager: list / create / delete boards (local).
- [x] Offline support: data survives reload via IndexedDB (covered by smoke tests).
- [x] Original SVG icons in `components/icons.tsx` (no icon libs).
- [x] `npm run typecheck && build && test && lint` green.
- [ ] PR reviewed and merged by lead.

## Phase 2 - Real-time collaboration
Goal: share boards and edit together live.

- [x] Supabase project decision (shared vs dedicated). (Shared project allowed; anon key used client-side only.)
- [x] Tables `boards`, `board_members` + RLS (`auth.uid()` ownership + membership).
- [x] Auth routes: `/api/auth/{login,logout,callback}`.
- [x] Boards API routes: `/api/boards` and `/api/boards/[id]`.
- [x] Board manager falls back to `/api/boards` when Supabase env vars are set, otherwise remains local-first via IndexedDB.
- [x] Smoke coverage for API route layer.
- [ ] Yjs doc per board; `y-indexeddb` offline, Supabase Realtime transport.
- [ ] Share/invite flow.
- [ ] Conflict-free merges via CRDT.
- [ ] Login page + logout button wired.

## Phase 3 - Rich nodes + AI
Goal: one space for docs, tables, todos, and AI help.

- [ ] Custom tldraw shapes: Doc, Table, Todo.
- [ ] AI panel (BYOK): summarize, outline to mind map.
- [ ] Reuse catnoted BYOK pattern.

## Phase 4 (optional) - Presentation
- [ ] Outline/board to slides view.

## Coordination
- Repo isolated from `CatNoted/CatNoted` to keep bundles separate.
- Design tokens mirrored from catnoted's terminal-retro system.
- All agent work follows the DOX contract in AGENTS.md.
