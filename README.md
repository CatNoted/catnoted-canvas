# CatNoted Canvas

CatNoted Canvas is a professional, local-first, privacy-focused all-in-one collaborative workspace. It integrates structured documents (reminiscent of Notion) with the spatial freedom of an interactive whiteboard (reminiscent of Miro) in a single unified interface.

The application operates primarily local-first, ensuring user data is persisted securely in the browser and accessible offline. Real-time collaboration and AI assist features are integrated as opt-in layers.

---

## Core Technologies

* **Frontend Framework:** Next.js (App Router) with strict TypeScript.
* **Canvas Engine:** tldraw SDK for free-form diagramming, shapes, and sketching.
* **Collaboration & Synchronization:** Yjs (CRDT) for conflict-free real-time sync.
* **Local Persistence:** IndexedDB via `y-indexeddb` for instant loading and offline capability.
* **Backend Services:** Supabase for authentication, relational storage, and Realtime channels.
* **Styling System:** Vanilla Tailwind CSS with custom terminal-retro themes.

---

## Development Automation (DOX Framework)

This repository follows the DOX workflow framework. Development processes are automated using autonomous agent contracts:

* **Orchestrator (Hermes):** Monitors repository status, plans tasks, and generates GitHub issues labeled `jules`.
* **Executor (Jules):** Picks up tasks labeled `jules`, implements changes in isolated feature branches, and submits Pull Requests.
* **Continuous Integration (CI):** Validates every Pull Request for build success, linting compliance, TypeScript type check safety, and unit test execution.
* **Branch Guard Security:** Direct pushes to the `main` branch are blocked via automated checks, requiring all modifications to undergo pull request validation.

---

## Getting Started

### Prerequisites

Ensure you have Node.js (version 20 or higher) and npm installed.

### Setup Instructions

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/CatNoted/catnoted-canvas.git
   cd catnoted-canvas
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy the example environment configuration and fill in the required keys:
   ```bash
   cp .env.example .env.local
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application in the browser.

### Available Scripts

* `npm run dev` : Launches the local development server.
* `npm run build` : Compiles the production build.
* `npm run start` : Runs the built Next.js production server.
* `npm run lint` : Runs ESLint checks.
* `npm run typecheck` : Executes TypeScript type validation.
* `npm run test` : Runs unit tests via Vitest.

---

## Technical Documentation

Detailed documentation on project systems is located in the following markdown files:

* [AGENTS.md](./AGENTS.md) : Detailed instructions, loop setups, and guidelines for autonomous developers.
* [ARCHITECTURE.md](./ARCHITECTURE.md) : High-level system design and execution flows.
* [PLAN.md](./PLAN.md) : Phase-by-phase development roadmaps and feature status.

---

## License

This project is licensed under the MIT License.
