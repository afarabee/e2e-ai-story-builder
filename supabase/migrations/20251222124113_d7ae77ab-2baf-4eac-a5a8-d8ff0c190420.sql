-- Eval Tables for Headless Python Runner
-- These tables are written to by external Python early_evals.py script

-- Table: sb_eval_runs
-- One row per batch evaluation run
create table public.sb_eval_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  
  -- Run metadata
  run_name text,                              -- Human-readable name for this run
  dataset_version text not null,              -- e.g., "v1.0", "seed_50"
  model text,                                 -- LLM model used (if applicable)
  prompt_version text,                        -- Prompt template version
  
  -- Aggregated results
  total_cases int not null default 0,
  passed_cases int not null default 0,
  failed_cases int not null default 0,
  
  -- Run status: running | completed | failed
  status text not null default 'running',
  completed_at timestamptz,
  error text                                  -- Error message if run failed
);

-- RLS: permissive for service role access
alter table public.sb_eval_runs enable row level security;
create policy "Allow all access to sb_eval_runs" on public.sb_eval_runs
  for all using (true) with check (true);

-- Table: sb_eval_cases
-- One row per evaluated story within a run
create table public.sb_eval_cases (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.sb_eval_runs(id) on delete cascade,
  created_at timestamptz not null default now(),
  
  -- Input/Output
  input_data jsonb not null,                  -- Seed input that was used
  output_story jsonb,                         -- Generated/refined story
  
  -- Links to existing tables (optional)
  session_id uuid references public.sb_sessions(id) on delete set null,
  story_id uuid references public.sb_stories(id) on delete set null,
  action_id uuid references public.sb_actions(id) on delete set null,
  
  -- Eval results from Python early_evals.py
  eval_results jsonb not null default '{}',   -- Full eval output from Python
  passed boolean not null default false,      -- Overall pass/fail
  
  -- Error tracking
  error text                                  -- Error if case failed to run
);

-- RLS: permissive for service role access
alter table public.sb_eval_cases enable row level security;
create policy "Allow all access to sb_eval_cases" on public.sb_eval_cases
  for all using (true) with check (true);

-- Index for querying cases by run
create index idx_eval_cases_run_id on public.sb_eval_cases(run_id);