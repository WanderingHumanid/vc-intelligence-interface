# Project Constitution

## 1. Project Map & State Tracking

### North Star
Build a deployed, production-quality VC sourcing web app where an analyst can discover a company, open its profile, trigger live AI enrichment from its real public website, and take action (save, note, export) — all without the Gemini API key ever touching the browser.

### Deliverables
- Next.js application (App Router) deployed on Vercel.
- Pages: `/companies`, `/companies/[id]`, `/lists`, `/saved`.
- Premium B2B SaaS UI with Tailwind CSS + shadcn/ui.
- Mock data in `/data/companies.json`.
- Direct browser `.csv` or `.json` downloads for list exports.

### Integrations
- **Jina AI Reader** (`r.jina.ai`) - Server-side scraping.
- **Google Gemini API** (`gemini-1.5-flash`) - Server-side text extraction.
- **Vercel** - Deployment target.

## 2. Behavioral Rules
- Prioritize reliability over speed. Never guess at business logic.
- Self-healing automation via B.L.A.S.T. protocol and A.N.T. 3-layer architecture.
- Follow the Data-First Rule: Schema before code.
- If logic changes, update architecture SOP before updating code.
- `GEMINI_API_KEY` must **never** appear in client-side code, browser bundle, or committed `.env`.
- Jina Reader calls must originate server-side only.
- Only scrape publicly accessible URLs.
- Enrichment must be explicitly user-triggered.
- Cache every enrichment result to localStorage immediately on success.
- Company search, filters, notes, and list membership are client-side only (localStorage).
- No database (Supabase, Postgres, Firebase).
- No paid APIs.

## 3. Data Schemas

### Enrichment API Response Payload (`POST /api/enrich`)
```json
{
  "summary": "1-2 sentence plain-English description",
  "whatTheyDo": ["bullet 1", "bullet 2"],
  "keywords": ["kw1", "kw2"],
  "signals": ["signal 1"],
  "sources": [
    { "url": "https://company.com", "fetchedAt": "2026-02-22T10:00:00Z" }
  ]
}
```

### Seed Company Data (Layer 1)
```json
{
  "id": "string",
  "name": "string",
  "website": "string",
  "sector": "string",
  "stage": "string",
  "location": "string",
  "founded": "string",
  "description": "string",
  "tags": ["string"],
  "headcount": "number"
}
```

### User State (Layer 2 & 3 - `localStorage`)
- `saved_searches`: Array of objects containing search queries and active filters.
- `user_lists`: Array of custom list objects (id, name, companyIds[]).
- `notes`: Map of `companyId -> note text`.
- `enrichment_cache`: Map of `companyId -> Enrichment API Response`.

## 4. Architectural Invariants
- **Layer 1: Architecture (`architecture/`)** - Technical SOPs and rules.
- **Layer 2: Navigation** - Next.js Router & client-side state hooks.
- **Layer 3: Tools (`tools/`) / Server** - Next.js Route Handlers (`/api/...`) for deterministic Node.js integrations (Jina + Gemini).
