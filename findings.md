# Findings

## Research, Discoveries, Constraints
- **Stack Decision:** Next.js (App Router), Tailwind CSS, shadcn/ui chosen to satisfy premium B2B SaaS aesthetics and strict zero-database, server-side-secrets-only constraints.
- **Enrichment Pipeline:** Jina AI Reader (`r.jina.ai`) is validated as a robust, key-less markdown extractor for web pages. Gemini 1.5 Flash via `@google/generative-ai` offers structural output adherence perfectly suited for the required JSON payload schema. Free tiers of both are well within limits.
- **Persistence:** Due to strict "no external DB" rules, all user states will be managed via robust React hooks wrapping the Browser's `localStorage` API, syncing strictly on the client-side.
