-- Enable pgvector extension
create extension if not exists vector;

-- Table: companies (Stores core company details, enrichment data, and vector embeddings)
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text not null,
  sector text not null,
  stage text not null,
  location text not null,
  description text not null, -- Short initial description
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- AI Enrichment Fields
  enrichment_summary text,
  what_they_do jsonb, -- Array of strings
  keywords jsonb, -- Array of strings
  signals jsonb, -- Array of strings
  sources jsonb, -- Array of objects
  thesis_score integer check (thesis_score >= 0 and thesis_score <= 100),
  thesis_explanation text,
  embedding vector(768), -- Gemini text-embedding-004 is 768 dimensions
  last_enriched_at timestamp with time zone
);

-- Ensure domains are unique
create unique index if not exists companies_domain_idx on public.companies(domain);

-- Table: saved_searches
create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  query text,
  sector text,
  stage text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: lists
create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: list_members (Junction table for lists <-> companies)
create table if not exists public.list_members (
  list_id uuid references public.lists(id) on delete cascade not null,
  company_id uuid references public.companies(id) on delete cascade not null,
  added_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (list_id, company_id)
);

-- Table: notes
create table if not exists public.notes (
  company_id uuid primary key references public.companies(id) on delete cascade not null,
  content text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Function: match_companies (For similarity search)
create or replace function match_companies (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  exclude_id uuid
)
returns table (
  id uuid,
  name text,
  domain text,
  sector text,
  stage text,
  similarity float
)
language sql stable
as $$
  select
    c.id,
    c.name,
    c.domain,
    c.sector,
    c.stage,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.companies c
  where c.id != exclude_id
    and c.embedding is not null
    and 1 - (c.embedding <=> query_embedding) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- RLS setup (Security Prioritization)
-- Because this is a single tenant B2B app right now without auth, we must expose these to 'anon' for the UI to work.
-- In a real multi-tenant app, we would restrict by user_id.
alter table public.companies enable row level security;
alter table public.saved_searches enable row level security;
alter table public.lists enable row level security;
alter table public.list_members enable row level security;
alter table public.notes enable row level security;

-- Policies for companies
create policy "Allow anon to select companies" on public.companies for select to anon using (true);
-- We DO NOT allow anon to insert/update companies. Only service_role can do this via API.

-- Policies for saved_searches (Full access to anon for MVP)
create policy "Allow anon to select saved_searches" on public.saved_searches for select to anon using (true);
create policy "Allow anon to insert saved_searches" on public.saved_searches for insert to anon with check (true);
create policy "Allow anon to update saved_searches" on public.saved_searches for update to anon using (true);
create policy "Allow anon to delete saved_searches" on public.saved_searches for delete to anon using (true);

-- Policies for lists (Full access to anon for MVP)
create policy "Allow anon to select lists" on public.lists for select to anon using (true);
create policy "Allow anon to insert lists" on public.lists for insert to anon with check (true);
create policy "Allow anon to update lists" on public.lists for update to anon using (true);
create policy "Allow anon to delete lists" on public.lists for delete to anon using (true);

-- Policies for list_members
create policy "Allow anon to select list_members" on public.list_members for select to anon using (true);
create policy "Allow anon to insert list_members" on public.list_members for insert to anon with check (true);
create policy "Allow anon to delete list_members" on public.list_members for delete to anon using (true);

-- Policies for notes
create policy "Allow anon to select notes" on public.notes for select to anon using (true);
create policy "Allow anon to insert notes" on public.notes for insert to anon with check (true);
create policy "Allow anon to update notes" on public.notes for update to anon using (true);
