# Eval Tables Schema Reference

This document defines the schema for the headless eval runner tables in Supabase.

---

## Table: `sb_eval_runs`

Stores metadata for each batch evaluation run.

| Column           | Type                     | Required | Default              | Description                                      |
|------------------|--------------------------|----------|----------------------|--------------------------------------------------|
| `id`             | `uuid`                   | Yes      | `gen_random_uuid()`  | Primary key                                      |
| `created_at`     | `timestamptz`            | Yes      | `now()`              | When the run was created                         |
| `run_name`       | `text`                   | No       | `NULL`               | Human-readable name (e.g., "nightly-2024-12-22") |
| `dataset_version`| `text`                   | Yes      | —                    | Version of seed inputs (e.g., "v1.0")            |
| `model`          | `text`                   | No       | `NULL`               | LLM model used (e.g., "gpt-4o")                  |
| `prompt_version` | `text`                   | No       | `NULL`               | Prompt template version                          |
| `total_cases`    | `integer`                | Yes      | `0`                  | Total number of cases in the run                 |
| `passed_cases`   | `integer`                | Yes      | `0`                  | Number of cases that passed                      |
| `failed_cases`   | `integer`                | Yes      | `0`                  | Number of cases that failed                      |
| `status`         | `text`                   | Yes      | `'running'`          | Run status: `running`, `completed`, `failed`     |
| `completed_at`   | `timestamptz`            | No       | `NULL`               | When the run finished                            |
| `error`          | `text`                   | No       | `NULL`               | Error message if run failed                      |

---

## Table: `sb_eval_cases`

Stores individual evaluated stories within a run.

| Column         | Type                     | Required | Default              | Description                                      |
|----------------|--------------------------|----------|----------------------|--------------------------------------------------|
| `id`           | `uuid`                   | Yes      | `gen_random_uuid()`  | Primary key                                      |
| `run_id`       | `uuid`                   | Yes      | —                    | FK → `sb_eval_runs.id` (CASCADE on delete)       |
| `created_at`   | `timestamptz`            | Yes      | `now()`              | When the case was created                        |
| `input_data`   | `jsonb`                  | Yes      | —                    | Seed input used (see shape below)                |
| `output_story` | `jsonb`                  | No       | `NULL`               | Generated story JSON                             |
| `session_id`   | `uuid`                   | No       | `NULL`               | FK → `sb_sessions.id` (if session was created)   |
| `story_id`     | `uuid`                   | No       | `NULL`               | FK → `sb_stories.id` (if story was saved)        |
| `action_id`    | `uuid`                   | No       | `NULL`               | FK → `sb_actions.id` (if action was logged)      |
| `eval_results` | `jsonb`                  | Yes      | `'{}'::jsonb`        | Evaluation results (see shape below)             |
| `passed`       | `boolean`                | Yes      | `false`              | Overall pass/fail for this case                  |
| `error`        | `text`                   | No       | `NULL`               | Error message if case failed                     |

---

## JSONB Shape: `input_data`

Matches the seed input structure from `eval_seed_inputs.json`:

```jsonc
{
  "id": "seed_001",                    // Required: unique seed identifier
  "role": "user",                      // Required: user role
  "goal": "reset my password",         // Required: what the user wants
  "benefit": "regain account access",  // Required: why they want it
  "context": {                         // Required: additional context
    "domain": "authentication",        // Required: problem domain
    "complexity": "low",               // Required: low | medium | high
    "edge_case": true,                 // Optional: is this an edge case?
    "note": "expired token scenario"   // Optional: additional notes
  }
}
```

---

## JSONB Shape: `output_story`

The generated story structure:

```jsonc
{
  "title": "Password Reset",           // Required: story title
  "description": "As a user...",       // Required: user story description
  "acceptance_criteria": [             // Required: array of criteria
    "Given I am on the login page...",
    "When I click forgot password...",
    "Then I receive a reset email..."
  ],
  "metadata": {                        // Optional: additional metadata
    "priority": "high",
    "tags": ["auth", "security"]
  }
}
```

---

## JSONB Shape: `eval_results`

Output from Python `early_evals.py` evaluation:

```jsonc
{
  "checks": {                          // Required: individual check results
    "has_title": {                     // Check name
      "passed": true,                  // Required: did the check pass?
      "message": "Title is present"    // Optional: explanation
    },
    "has_description": {
      "passed": true,
      "message": "Description follows As a... format"
    },
    "has_acceptance_criteria": {
      "passed": true,
      "message": "3 acceptance criteria found"
    },
    "criteria_are_testable": {
      "passed": false,
      "message": "Criterion 2 is vague: 'works correctly'"
    },
    "matches_goal": {
      "passed": true,
      "message": "Story addresses password reset goal"
    }
  },
  "summary": {                         // Required: aggregate results
    "total_checks": 5,                 // Required: number of checks run
    "passed_checks": 4,                // Required: number that passed
    "failed_checks": 1,                // Required: number that failed
    "pass_rate": 0.8                   // Required: passed / total
  }
}
```

---

## Example SQL: Creating a Run

```sql
INSERT INTO sb_eval_runs (
  run_name,
  dataset_version,
  model,
  prompt_version,
  total_cases,
  status
) VALUES (
  'nightly-2024-12-22',
  'v1.0',
  'gpt-4o',
  'v2.1',
  50,
  'running'
)
RETURNING id;
```

---

## Example SQL: Writing a Case

```sql
INSERT INTO sb_eval_cases (
  run_id,
  input_data,
  output_story,
  session_id,
  story_id,
  action_id,
  eval_results,
  passed
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000',  -- run_id from above
  '{
    "id": "seed_001",
    "role": "user",
    "goal": "reset my password",
    "benefit": "regain account access",
    "context": {"domain": "authentication", "complexity": "low"}
  }'::jsonb,
  '{
    "title": "Password Reset",
    "description": "As a user, I want to reset my password so that I can regain account access",
    "acceptance_criteria": ["Given...", "When...", "Then..."]
  }'::jsonb,
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',  -- session_id (optional)
  'ffffffff-1111-2222-3333-444444444444',  -- story_id (optional)
  '55555555-6666-7777-8888-999999999999',  -- action_id (optional)
  '{
    "checks": {
      "has_title": {"passed": true},
      "has_description": {"passed": true},
      "has_acceptance_criteria": {"passed": true},
      "criteria_are_testable": {"passed": true},
      "matches_goal": {"passed": true}
    },
    "summary": {"total_checks": 5, "passed_checks": 5, "failed_checks": 0, "pass_rate": 1.0}
  }'::jsonb,
  true
);
```

---

## Example SQL: Finalizing a Run (Success)

```sql
UPDATE sb_eval_runs
SET
  status = 'completed',
  passed_cases = 45,
  failed_cases = 5,
  completed_at = now()
WHERE id = '123e4567-e89b-12d3-a456-426614174000';
```

---

## Example SQL: Finalizing a Run (Failure)

```sql
UPDATE sb_eval_runs
SET
  status = 'failed',
  error = 'API rate limit exceeded after 23 cases',
  completed_at = now()
WHERE id = '123e4567-e89b-12d3-a456-426614174000';
```

---

## Indexes and Foreign Keys

| Table           | Index/Constraint                | Type        | Notes                                    |
|-----------------|--------------------------------|-------------|------------------------------------------|
| `sb_eval_runs`  | `id` (PK)                      | Primary Key | Auto-generated UUID                      |
| `sb_eval_cases` | `id` (PK)                      | Primary Key | Auto-generated UUID                      |
| `sb_eval_cases` | `run_id` → `sb_eval_runs.id`   | Foreign Key | `ON DELETE CASCADE` — deleting a run removes all its cases |
| `sb_eval_cases` | `session_id` → `sb_sessions.id`| Foreign Key | Optional, for traceability               |
| `sb_eval_cases` | `story_id` → `sb_stories.id`   | Foreign Key | Optional, for traceability               |
| `sb_eval_cases` | `action_id` → `sb_actions.id`  | Foreign Key | Optional, for traceability               |

**Note:** Consider adding an index on `sb_eval_cases(run_id)` if querying cases by run becomes slow.

---

## Service-Role Access

Both tables use RLS policies that allow all operations when authenticated with the service role:

```sql
-- Policy on both tables
CREATE POLICY "Allow all access to sb_eval_*"
ON public.sb_eval_runs  -- and sb_eval_cases
FOR ALL
TO public
USING (true)
WITH CHECK (true);
```

### Python Connection Example

```python
from supabase import create_client
import os

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"]  # Required for RLS bypass
)
```

### Required Environment Variables

| Variable                    | Description                              |
|-----------------------------|------------------------------------------|
| `SUPABASE_URL`              | Project URL (e.g., `https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS)          |
