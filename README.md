# E2E AI Story Builder

**End-to-end AI-powered user story generation with Definition-of-Ready enforcement, evaluation scoring, and human-in-the-loop review.**

This project demonstrates how to design and ship an AI-assisted product workflow that goes beyond simple text generation by combining structured generation, deterministic gating (DoR), post-generation evaluation (evals), and transparent, reviewable outputs for humans.

This project is part of the **AI with Aimee** portfolio and reflects real-world enterprise AI patterns.

---

## 🎯 What This Project Demonstrates

This repo is a **working demo**, not a toy example.

It shows how to:

* Generate user stories from raw input using LLMs (OpenAI / Gemini)
* Enforce **Definition of Ready (DoR)** as a hard gate with testability heuristics
* Run **evaluations (evals) after DoR passes** across 5 dimensions
* Compare outputs across models side-by-side
* Surface quality signals to humans without blocking flow
* Build observable, auditable AI systems with debug tooling

---

## 🧠 Core Design Principles

### 1. DoR is not an Eval

* **Definition of Ready (DoR)** is a *gate*
  → A story must pass DoR before it can move forward.
  → Uses deterministic testability heuristics (50% threshold)
* **Evals** are *measurements*
  → Evals run **after** DoR passes.
  → Eval failures surface risk, not automation loops.
  → Humans decide what to do next.

This separation is intentional and critical for responsible AI systems.

### 2. Human-in-the-Loop by Design

* The system never "silently fixes" quality issues post-DoR
* Eval failures surface as:
  * Dimension-level scores with explanations
  * "Unclear" badges on flagged acceptance criteria
  * Visual highlighting in the story editor
* Humans decide what to do next

### 3. Single Source of Truth

* DoR status derives from `testability_debug.passed`
* No redundant or conflicting testability checks
* Debug payloads prove exactly what logic ran

---

## 🏗 Architecture Overview

```
Lovable UI (React + Vite)
       |
       v
Supabase Edge Function (sb-run)
       |
       v
Lovable AI Gateway
       |
       v
LLMs (OpenAI / Gemini)
```

### Responsibilities by Layer

#### Lovable UI

* Story input (role / goal / benefit)
* Model selection (OpenAI / Gemini / both)
* Side-by-side comparison views
* DoR status cards and eval scorecards
* Debug tools (View Run Input modal)

#### Edge Function (sb-run)

* Orchestration of story generation runs
* Prompt template filling and LLM calls
* Testability heuristic evaluation
* DoR gating logic
* Eval scoring (5 dimensions)
* Persistence to Supabase tables

#### Lovable AI Gateway

* Unified access to OpenAI and Gemini models
* Secret management (no API keys in code)
* Tool-calling enforcement for structured output

---

## ✨ Key Features

### Story Generation

* Accepts role/goal/benefit inputs
* Generates structured user stories with 3-7 acceptance criteria
* Uses tool-calling with JSON schema for reliable output
* Includes validation and repair loop for malformed responses

### Definition of Ready (DoR)

* **Testability threshold**: 50% of ACs must match heuristic patterns
* 8 testability patterns (action verbs, conditionals, state changes, etc.)
* Pass/fail status with detailed breakdown
* `testability_debug` payload for transparency

### Evaluations

5 scoring dimensions (1-5 scale):

| Dimension | What it measures |
|-----------|-----------------|
| Clarity | Unambiguous language, no jargon |
| Testability | Observable, verifiable criteria |
| Completeness | Edge cases, error paths covered |
| Specificity | Concrete details, no vague terms |
| Scope | Single deliverable, right-sized |

Each dimension includes explanations and flagged items.

### Model Comparison

* Side-by-side OpenAI vs Gemini output
* Synchronized DoR and eval results
* Visual diff for quick comparison

### Debug Tools

* **View Run Input** modal with tabs:
  * **Messages**: System prompt (filled template) + user input
  * **Payload**: Full LLM request with secrets redacted
* Build ID and heuristic version for deployment verification

---

## 🔧 Technical Implementation

### Edge Function (sb-run)

Current versions:
* `SB_RUN_BUILD_ID`: `2026-01-07c`
* `TESTABILITY_HEURISTIC_VERSION`: `2026-01-07a`

Key implementation details:

1. **Tool-calling enforcement**: Uses `tool_choice: "required"` with JSON schema
2. **No response_format**: Omitted to ensure OpenAI/Gemini compatibility
3. **Content-JSON fallback**: Parses tool call arguments or content as JSON
4. **Secret redaction**: API keys replaced with `[REDACTED]` in debug payloads

### Testability Heuristics

8 patterns that indicate an AC is testable:

| # | Pattern | Example |
|---|---------|---------|
| 1 | Action-verb prefixes | "User can...", "System shall..." |
| 2 | Conditional/temporal | "When...", "If...", "After..." |
| 3 | Action-oriented verbs | "Click", "Submit", "Navigate" |
| 4 | Security constraints | "HTTPS", "encrypted", "HttpOnly" |
| 5 | Performance bounds | "within 2 seconds", "< 500ms" |
| 6 | Passive-verifiable | "is stored", "is displayed" |
| 7 | State/outcome verbs | "remains", "redirects", "shows" |
| 8 | Negation patterns | "cannot", "must not", "no" |

Threshold: ≥50% of ACs must match at least one pattern.

### DoR-Testability Synchronization

```typescript
// DoR passed = testability passed (single source of truth)
dor.passed = testabilityDebug.passed;
dor.fail_reasons = testabilityDebug.passed ? [] : ["Less than half of acceptance criteria appear testable."];
dor.testability_debug = testabilityDebug;
```

---

## 🗄 Data Model (Supabase)

Tables prefixed with `sb_` (Story Builder scope):

| Table | Purpose |
|-------|---------|
| `sb_sessions` | User sessions with context defaults |
| `sb_stories` | Generated stories with DoR, eval, and debug metadata |
| `sb_actions` | Pipeline trace/actions for auditing |
| `sb_prompt_versions` | Versioned prompt templates |
| `sb_eval_runs` | Batch evaluation run metadata |
| `sb_eval_cases` | Individual eval case results |

Stories are stored as JSONB with nested `dor`, `eval`, and `debug` objects.

---

## 🖥 UI Components

| Component | Purpose |
|-----------|---------|
| `StoryBuilder` | Main generation interface with model selection |
| `DoRStatusCard` | Pass/fail badge with testability breakdown |
| `RunEvaluationCard` | 5-dimension eval scorecard with explanations |
| `ComparePanel` | Side-by-side model comparison view |
| `RunInputModal` | Debug modal (Messages + Payload tabs) |

---

## 🚀 Getting Started

### Prerequisites

* Node.js 18+
* Lovable Cloud project (provides Supabase backend)

### Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

### Testing Story Generation

1. Open the Story Generator page
2. Enter role, goal, and benefit
3. Select model(s) and click Generate
4. Check DoR status card for pass/fail
5. Review eval scores and flagged items
6. Use "View Input" to inspect debug payload

### Verifying Deployment

Check the Payload tab for:
* `debug.build_id` = `"2026-01-07c"`
* `debug.testability.version` = `"2026-01-07a"`
* `dor.passed` matches `dor.testability_debug.passed`

---

## 🔐 Security & Secrets

* No API keys stored in code
* All secrets managed via Lovable Cloud
* LLM calls executed server-side only
* Debug payloads redact sensitive values

This repo is safe to be **public**.

---

## 📌 Status & Roadmap

### Implemented ✅

* Story generation via OpenAI/Gemini
* DoR gating with testability heuristics
* 5-dimension eval scoring
* Side-by-side model comparison
* Debug tools (View Run Input)
* Build versioning for deployment verification

### Planned 🔜

* Field-level refinement with chat
* Prompt version A/B testing
* Batch eval runner integration
* Export/import story sets

---

## 📚 Why This Exists

Most AI demos stop at:

> "Look, the model generated text."

This project goes further:

* It treats AI as a **system**, not a prompt
* It distinguishes readiness from quality
* It makes AI outputs reviewable, comparable, and governable

This is the level of rigor required for AI in real product environments.

---

*Built with Lovable · Part of the AI with Aimee portfolio*
