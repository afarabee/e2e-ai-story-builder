# E2E AI Story Builder

**End-to-end AI-powered user story generation with Definition-of-Ready enforcement, evaluation (evals), and human-in-the-loop review.**

This project demonstrates how to design and ship an AI-assisted product workflow that goes beyond simple text generation by combining:

* structured generation,
* iterative refinement,
* deterministic gating (DoR),
* post-generation evaluation (evals), and
* transparent, reviewable outputs for humans.

---

## 🎯 What This Project Demonstrates

This repo is intentionally built as a **working demo**, not a toy example.

It shows how to:

* Generate user stories from raw input using LLMs
* Enforce **Definition of Ready (DoR)** as a hard gate
* Run **evaluations (evals) after DoR passes** (evals ≠ DoR)
* Compare outputs across models (OpenAI vs Gemini)
* Surface quality signals to humans without blocking flow
* Design AI systems that are observable, auditable, and demoable

This project is part of the **AI with Aimee** portfolio and is designed to reflect real-world enterprise AI patterns.

---

## 🧠 Core Design Principles

### 1. DoR is not an Eval

* **Definition of Ready (DoR)** is a *gate*
  → A story must pass DoR before it can move forward.
* **Evals** are *measurements*
  → Evals run **after** DoR passes.
  → Evals may fail without triggering refinement.
  → Failures surface risk, not automation loops.

This separation is intentional and critical for responsible AI systems.

---

### 2. Human-in-the-Loop by Design

* The system never “silently fixes” quality issues post-DoR.
* Eval failures surface as:

  * “Needs review” badges
  * Dimension-level scores
  * Explicit flags and checklists
* Humans decide what to do next.

---

### 3. Real Architecture, Not a Monolith

This project uses a **hybrid architecture** to reflect production patterns.

---

## 🏗 Architecture Overview

The Python story-generation pipeline used by this system—including generation, refinement, field-level edits, and Definition-of-Ready enforcement—was authored by the project owner and is intentionally separated into a standalone service to preserve testability, reuse, and governance boundaries.


```
Lovable UI
   |
   v
Supabase Edge Functions (Orchestration)
   |
   v
Python Story Pipeline Service
   |
   v
LLMs (OpenAI / Gemini)
```

### Responsibilities by Layer

#### Lovable UI

* Story input & configuration
* Model selection (OpenAI / Gemini / both)
* Side-by-side comparison views
* Eval scorecards and review checklists

#### Supabase Edge Functions

* Authentication & session handling
* Orchestration of story runs
* Persistence to Supabase tables
* No LLM logic, no story logic

#### Python Story Pipeline (separate repo)

* Generate → refine → refine-field
* Definition-of-Ready checks
* Iterative improvement loops
* Post-DoR eval execution

> The Python service runs **actual pipeline code**, not reimplemented logic.

---

## 🗄 Data Model (Supabase)

This repo uses a Story Builder–scoped schema (`sb_*`).

Key tables:

* `sb_sessions` – user sessions
* `sb_stories` – generated stories (one per model/run)
* `sb_eval_runs` – eval results per story
* `sb_actions` – pipeline trace/actions
* `sb_eval_cases` – eval definitions (future use)

This structure enables:

* Side-by-side model comparison
* Eval dashboards over time
* Traceability for demos and audits

---

## 🔁 Workflow (Current + Planned)

### Current (in progress)

* Story Generator UI (Lovable)
* Supabase schema in place
* Edge Function scaffolding
* Python pipeline validated independently

### Next (incremental)

1. Wire UI → Edge Function (`sb-run`)
2. Connect Edge → Python service
3. Run real LLM calls (OpenAI first, Gemini next)
4. Store stories + DoR results
5. Run evals after DoR pass
6. Surface evals in UI (non-blocking)
7. Enable side-by-side model comparison

---

## 📊 Evals (High-Level)

Eval dimensions (v1, subject to iteration):

* Clarity & unambiguity
* Acceptance criteria testability
* Domain correctness
* Completeness (edge cases, error paths)
* Scope appropriateness

Eval strategy:

* Hybrid approach:
  * Deterministic checks
  * LLM-as-judge with strict rubric
* Eval failure ≠ refinement trigger
* Eval results inform human review

---

## 🔐 Security & Secrets

* No API keys are stored in this repo
* All secrets live in Supabase project settings
* LLM calls are executed server-side only

This repo is safe to be **public**.

---

## 📌 Why This Exists

Most AI demos stop at:

> “Look, the model generated text.”

This project goes further:

* It treats AI as a **system**, not a prompt
* It distinguishes readiness from quality
* It makes AI outputs reviewable, comparable, and governable

This is the level of rigor required for AI in real product environments.

---

## 🚧 Status

This project is under active development.
The README will evolve alongside the implementation.

---
