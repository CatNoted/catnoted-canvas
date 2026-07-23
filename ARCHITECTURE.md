## Autonomous Loop

This repo participates in event-driven automation:
- Issues labeled `jules` are picked up by Jules for implementation.
- Pull requests go through `auto-merge.yml`; merges happen after CI is green.
- Closed PRs auto-close referenced issues via `close-issues-on-merge.yml`.

## Authentication and Shared Domain SSO

CatNoted Canvas integrates seamlessly with CatNoted (the structured document workspace) to provide Single Sign-On (SSO). This ensures that a user signed in to one application is automatically recognized and authenticated in the other without re-login.

### Subdomain Shared Cookies

Because browser cookie policies restrict setting cookies across entirely different apex domains (e.g., from `catnoted.app` to `vercel.app`), both applications are hosted as subdomains on a single shared apex domain.

1. **Configuration:**
   - When the optional `NEXT_PUBLIC_COOKIE_DOMAIN` environment variable is defined (e.g. `.catnoted.app` or `.catnoted.com`), the browser and server Supabase clients configure their cookie options to scope session cookies to the parent/apex domain.
   - Example setting: `NEXT_PUBLIC_COOKIE_DOMAIN=.catnoted.app`
2. **Mechanism:**
   - Both `createBrowserClient` and `createServerClient` configure `@supabase/ssr` with the given wildcard cookie domain.
   - When a session is established or refreshed, the session cookie (typically `sb-<project-id>-auth-token`) is saved with the parent domain scope, making it visible to all subdomains (e.g. `app.catnoted.com` and `canvas.catnoted.com`).
3. **Local-First Fallback:**
   - If the environment variables are not set or the Supabase instance is offline, the client degrades gracefully.
   - Boards are persisted and edited locally within IndexedDB, preserving offline capability and robust operation.

### Safe Callbacks

The OAuth/sign-in redirect endpoint `/api/auth/callback` handles code exchange and supports redirecting back to any safe target using the `next` query parameter. It prevents open-redirect exploits by restricting absolute URLs to verified trusted subdomains (`catnoted.app`, `catnoted.com`) and relative paths.
