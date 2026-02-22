# 🔍 VC Intelligence Interface — Precision AI Scout

A premium AI-powered startup intelligence platform for venture capital analysts. Search, filter, enrich, and score startup targets using **Google Gemini**, **Jina AI Reader**, and **Supabase pgvector** — all within a sleek Next.js 16 interface.

---

## ✨ What It Does

This platform lets you:

- **Discover** companies from a curated database with advanced, divisive filters
- **Track any company** by URL — dynamically insert unseen startups into the system
- **AI Enrich** any profile at the click of a button — scrape the web, extract structured signals, and score against a VC thesis
- **Find Similar** startups using cosine similarity on 768-dimensional embeddings stored in PostgreSQL
- **Organize** targets into named lists, export to CSV/JSON, and save search filters as reusable shortcuts
- **Take analyst notes** per company, saved securely to the cloud

---

## 🏗️ Architecture Overview

```
┌────────────────────────────────────────────────────┐
│                  Next.js 16 Frontend               │
│  (React 19 + Tailwind CSS 4 + shadcn/ui + Sonner)  │
├────────────────────────────────────────────────────┤
│            /api/enrich    /api/companies            │
│         (Server-Side Route Handlers)               │
│    ┌──────────┐  ┌───────────┐  ┌───────────────┐  │
│    │ Jina AI  │→ │  Gemini   │→ │   Supabase    │  │
│    │ Reader   │  │ 2.5-flash │  │  (pgvector)   │  │
│    └──────────┘  └───────────┘  └───────────────┘  │
└────────────────────────────────────────────────────┘
```

**Data flow for enrichment:**
1. **Jina AI Reader** scrapes the company's website to extract raw markdown content
2. **Google Gemini** receives the markdown and extracts structured fields (summary, signals, keywords, what they do)
3. **Gemini Thesis Scorer** evaluates the company against a B2B/AI VC thesis, returning a 0–100 score with explanation
4. **Gemini Embeddings** (`text-embedding-004`) generates a 768-dimensional vector for similarity search
5. Everything is persisted to **Supabase PostgreSQL** via the `service_role` key (bypasses RLS securely)

---

## 📁 Project Structure

```
vc-intelligence-interface/
├── data/
│   └── companies.json          # Seed data (25 curated startups)
├── scripts/
│   └── seed.js                 # Seeds companies.json into Supabase
├── supabase/
│   └── migrations/
│       └── initial_schema.sql  # Full DB schema (tables, indexes, RLS policies)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── enrich/route.ts      # AI enrichment pipeline
│   │   │   └── companies/route.ts   # Dynamic company insertion
│   │   ├── companies/
│   │   │   ├── page.tsx             # Discover page (search + filters + table)
│   │   │   └── [id]/page.tsx        # Company profile (enrichment + similarity)
│   │   ├── lists/page.tsx           # Named list management
│   │   ├── saved/page.tsx           # Saved search shortcuts
│   │   ├── globals.css              # Design system (Claude-inspired theme)
│   │   └── layout.tsx               # Root layout with sidebar + themes
│   ├── components/
│   │   ├── Sidebar.tsx              # Navigation sidebar
│   │   ├── ThemeToggle.tsx          # Light/Dark mode switch
│   │   └── ui/                      # shadcn/ui components
│   └── lib/
│       └── supabase/
│           ├── client.ts            # Browser-side Supabase client (anon key)
│           └── server.ts            # Server-side Supabase client (service_role)
└── .env                             # Environment variables (see below)
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com/) project
- A [Google AI Studio](https://aistudio.google.com/) API key (for Gemini)

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd vc-intelligence-interface
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```ini
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
GROQ_API_KEY=your-groq-api-key
```

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API (⚠️ Keep this secret!) |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| `GROQ_API_KEY` | [Groq Console](https://console.groq.com/keys) (optional — used as automatic fallback) |

### 3. Set Up the Database

Run the SQL migration in your Supabase SQL Editor:

1. Go to your Supabase Dashboard → **SQL Editor**
2. Paste the contents of `supabase/migrations/initial_schema.sql`
3. Click **Run**

This creates all necessary tables, indexes, RLS policies, and the `match_companies` similarity search function.

### 4. Seed the Database

```bash
node scripts/seed.js
```

This inserts 25 curated startup companies into the `companies` table.

### 5. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📖 Features Guide

### 🔎 Discover Page (`/companies`)

The main registry of all tracked startups. Features:

- **Full-text search** across company names and descriptions
- **Primary filters:** Sector and Stage dropdowns
- **Advanced filters** (click the "Advanced" button):
  - 📍 **Location** — filter by city/region
  - ✅ **Enrichment Status** — show only enriched or pending targets
  - 📊 **Thesis Score** — slide to set a minimum AI-scored threshold (0–100)
- **Sortable columns** — click any header to sort ascending/descending
- **Keyboard shortcut**: Press `/` to instantly focus the search bar
- **Track New Target** — click the teal button to add *any* company by URL

### 🏢 Company Profile (`/companies/[id]`)

Each company has a detailed profile showing:

- Basic info (name, domain, sector, stage, location)
- **"Vector Enrich" button** — triggers the full AI pipeline (Jina → Gemini → Embedding)
- After enrichment:
  - AI-generated summary
  - What they do (structured list)
  - Signals and keywords
  - **Thesis Score** with explanation
  - **Find Similar** companies via pgvector cosine similarity
- **Analyst Notes** — write and save notes per company (Cmd/Ctrl+S auto-saves)
- **List Management** — add/remove the company from named lists
- **Keyboard shortcut**: Press `e` to trigger enrichment

### 📋 Lists (`/lists`)

Organize companies into custom buckets:

- Create named lists
- Add companies from profile pages
- Export any list as **CSV** or **JSON**
- Copy formatted Slack-ready text
- Clear or delete lists

### 💾 Saved Searches (`/saved`)

Save your frequently used filter combinations:

- Name a shortcut with specific search query, sector, and stage
- One-click "Execute Search" buttons route you back to the Discover page with all filters pre-applied
- All shortcuts synced to Supabase

### 🌙 Dark Mode

Toggle between light and dark themes using the button at the bottom of the sidebar. The dark theme uses a warm, Claude-inspired palette (`#262624` background).

---

## 🔑 Key Design Decisions

| Decision | Rationale |
|---|---|
| **Supabase over localStorage** | Production-ready persistence, vector search, and real SQL queries |
| **pgvector for similarity** | Native PostgreSQL cosine distance — no external vector DB needed |
| **Server-side enrichment only** | API keys never reach the browser; `service_role` bypasses RLS safely |
| **Rate limiting via `last_enriched_at`** | 1 enrichment per company per hour prevents API exhaustion |
| **Upsert on domain** | Ensures idempotent seeding and prevents duplicate entries |
| **Dynamic company tracking** | Any URL can be added — the system creates a shell, and enrichment fills the details |

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `/` | Focus the search bar on the Discover page |
| `e` | Trigger Vector Enrichment on a company profile |
| `Cmd+S` / `Ctrl+S` | Save analyst notes on a company profile |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript + React 19 |
| **Styling** | Tailwind CSS 4 + shadcn/ui |
| **Database** | Supabase PostgreSQL + pgvector |
| **AI Models** | Google Gemini 2.5-flash (structured extraction + scoring) |
| **Embeddings** | Gemini embedding-001 (3072 dimensions) |
| **Web Scraping** | Jina AI Reader |
| **Theming** | next-themes (light/dark) |
| **Notifications** | Sonner toast system |

---

## 📜 License

This project is private and intended for educational/assessment purposes.
