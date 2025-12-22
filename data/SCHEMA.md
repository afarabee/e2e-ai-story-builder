# Eval Tables Schema

Documentation for the headless eval runner tables. These tables are written to by the external Python `early_evals.py` script using the Supabase service role key.

## Tables

### `sb_eval_runs`

One row per batch evaluation run.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `created_at` | timestamptz | No | `now()` | When the run started |
| `run_name` | text | Yes | null | Human-readable name (e.g., "nightly-2024-12-22") |
| `dataset_version` | text | No | - | Dataset identifier (e.g., "v1.0", "seed_50") |
| `model` | text | Yes | null | LLM model used (e.g., "gpt-4", "claude-3") |
| `prompt_version` | text | Yes | null | Prompt template version (e.g., "v2.1") |
| `total_cases` | int | No | 0 | Total number of cases in run |
| `passed_cases` | int | No | 0 | Number of cases that passed all evals |
| `failed_cases` | int | No | 0 | Number of cases that failed any eval |
| `status` | text | No | `'running'` | Run status: `running`, `completed`, `failed` |
| `completed_at` | timestamptz | Yes | null | When the run finished |
| `error` | text | Yes | null | Error message if run failed |

### `sb_eval_cases`

One row per evaluated story within a run.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `run_id` | uuid | No | - | FK to `sb_eval_runs.id` (cascade delete) |
| `created_at` | timestamptz | No | `now()` | When the case was evaluated |
| `input_data` | jsonb | No | - | Seed input used for generation |
| `output_story` | jsonb | Yes | null | Generated/refined story |
| `session_id` | uuid | Yes | null | FK to `sb_sessions.id` (optional) |
| `story_id` | uuid | Yes | null | FK to `sb_stories.id` (optional) |
| `action_id` | uuid | Yes | null | FK to `sb_actions.id` (optional) |
| `eval_results` | jsonb | No | `'{}'` | Full eval output from Python |
| `passed` | boolean | No | false | Overall pass/fail for this case |
| `error` | text | Yes | null | Error message if case failed to run |

---

## JSONB Shapes

### `input_data` (from `eval_seed_inputs.json`)

```json
{
  "id": "seed_001",
  "role": "user",
  "goal": "log in securely using my email and password",
  "benefit": "access my personalized dashboard and data",
  "context": {
    "domain": "authentication",
    "complexity": "low" | "medium" | "high",
    "edge_case": true,
    "note": "Optional note about this input"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for the seed input |
| `role` | string | Yes | "As a [role]..." portion of user story |
| `goal` | string | Yes | "I want to [goal]..." portion |
| `benefit` | string | Yes | "So that [benefit]..." portion |
| `context.domain` | string | No | Category (e.g., "authentication", "ecommerce") |
| `context.complexity` | string | No | Expected complexity: "low", "medium", "high" |
| `context.edge_case` | boolean | No | Whether this is an edge case input |
| `context.note` | string | No | Additional notes about the input |

### `output_story` (generated story)

```json
{
  "title": "User Login",
  "description": "As a user, I want to log in securely using my email and password so that I can access my personalized dashboard and data.",
  "acceptance_criteria": [
    "User can enter email and password on login form",
    "System validates credentials against stored records",
    "User receives error message for invalid credentials",
    "User is redirected to dashboard on successful login",
    "Session token is stored securely"
  ],
  "metadata": {
    "generated_at": "2024-12-22T10:30:00Z",
    "model": "gpt-4",
    "prompt_version": "v2.1"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Short title for the story |
| `description` | string | Yes | Full user story in "As a... I want... so that..." format |
| `acceptance_criteria` | string[] | Yes | List of acceptance criteria |
| `metadata` | object | No | Generation metadata |

### `eval_results` (from Python `early_evals.py`)

```json
{
  "checks": [
    {
      "name": "has_title",
      "passed": true,
      "message": null
    },
    {
      "name": "has_description",
      "passed": true,
      "message": null
    },
    {
      "name": "description_format",
      "passed": false,
      "message": "Missing 'so that' clause"
    },
    {
      "name": "min_acceptance_criteria",
      "passed": true,
      "message": null
    },
    {
      "name": "max_acceptance_criteria",
      "passed": true,
      "message": null
    },
    {
      "name": "no_duplicate_ac",
      "passed": true,
      "message": null
    },
    {
      "name": "description_length",
      "passed": true,
      "message": null
    },
    {
      "name": "acs_are_actionable",
      "passed": false,
      "message": "AC #3 does not start with a verb"
    }
  ],
  "summary": {
    "total": 8,
    "passed": 6,
    "failed": 2
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `checks` | array | Yes | List of individual eval check results |
| `checks[].name` | string | Yes | Check identifier |
| `checks[].passed` | boolean | Yes | Whether check passed |
| `checks[].message` | string | No | Failure reason (null if passed) |
| `summary.total` | int | Yes | Total number of checks run |
| `summary.passed` | int | Yes | Number of checks passed |
| `summary.failed` | int | Yes | Number of checks failed |

---

## Python Writer Example

```python
from supabase import create_client
import os

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"]
)

# 1. Create a run
run = supabase.table("sb_eval_runs").insert({
    "run_name": "nightly-2024-12-22",
    "dataset_version": "v1.0",
    "model": "gpt-4",
    "prompt_version": "v2.1",
    "status": "running"
}).execute()

run_id = run.data[0]["id"]

# 2. Insert cases
for seed_input in dataset["inputs"]:
    # Generate story...
    output_story = generate_story(seed_input)
    
    # Run evals...
    eval_results = run_early_evals(output_story)
    
    # Insert case
    supabase.table("sb_eval_cases").insert({
        "run_id": run_id,
        "input_data": seed_input,
        "output_story": output_story,
        "eval_results": eval_results,
        "passed": eval_results["summary"]["failed"] == 0
    }).execute()

# 3. Update run with final stats
supabase.table("sb_eval_runs").update({
    "status": "completed",
    "completed_at": "now()",
    "total_cases": total,
    "passed_cases": passed,
    "failed_cases": failed
}).eq("id", run_id).execute()
```

---

## Environment Variables

The Python runner needs these environment variables:

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (NOT anon key) |

These are available in the Lovable Cloud secrets.
