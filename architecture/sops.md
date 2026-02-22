# Technical SOP: VC Intelligence Interface

## 1. Routing (Next.js App Router)
- `/companies` -> Dashboard to browse, search, and filter mock companies.
- `/companies/[id]` -> Individual detail & enrichment view.
- `/lists` -> Manage lists of companies.
- `/saved` -> Manage saved search queries.
- **API**: `/api/enrich` -> Server-side only endpoint that calls Jina AI and Google Gemini.

## 2. State Management (Client-Side Local Storage)
Since there is no external database, all user state resides in browser `localStorage`.
- We use a custom React hook `useLocalStorageState(key, initialValue)` to preserve state across refreshes.
- Global stores or contexts will wrap the local storage hooks to provide seamless UI updates.

The 4 major local storage keys:
1. `vc_user_lists`: Array of custom lists.
2. `vc_saved_searches`: Array of filter states.
3. `vc_notes`: Key-value map of companyId -> note string.
4. `vc_enrichment_cache`: Key-value map of companyId -> Gemini output JSON payload.

## 3. The Enrichment Pipeline
**Trigger**: User clicks "Enrich" on `/companies/[id]`.
**Action**:
1. Check `vc_enrichment_cache[id]`. If exists, display cached data unless user forced "Re-enrich".
2. Enter `Loading` state.
3. Call `POST /api/enrich` with the company's `website`.
4. API calls `r.jina.ai/{url}` to fetch Markdown.
5. API constructs prompt using `gemini-1.5-flash` with JSON output schema.
6. API returns structured JSON.
7. Client parses JSON, saves payload into `vc_enrichment_cache[id]`.
8. UI transitions to `Success` and renders inline data.
9. If error, UI transitions to `Error` and displays the error message inline.

## 4. API Security & Constraints
- `GEMINI_API_KEY` exists purely in Vercel environment variables or local `.env.local` for testing.
- It must NEVER be exposed using `NEXT_PUBLIC_...` prefix.
- The `fetch` calls to Jina AI Reader MUST happen server-side inside the `/api/enrich` route handler to prevent exposing logic or bypassing CORS limitations unexpectedly.
