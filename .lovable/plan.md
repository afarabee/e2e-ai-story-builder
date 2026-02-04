

# Plan: Generate Updated README.md

## Overview

The current README.md is outdated and describes the project as "in progress" with planned features that have since been implemented. I'll create an updated README that accurately reflects the current working state of the application.

## Key Updates Needed

### 1. Architecture Section
**Current**: Shows a 3-layer architecture with a separate Python pipeline service
**Update**: The architecture has evolved - the edge function (`sb-run`) now handles story generation directly via Lovable AI Gateway, eliminating the separate Python service

### 2. Workflow Status
**Current**: Lists many features as "planned" or "next"
**Update**: Most core features are now implemented:
- Story generation via OpenAI/Gemini models
- Definition of Ready (DoR) gating with testability heuristics
- Evaluation scoring with dimension breakdowns
- Side-by-side model comparison
- Debug tools (View Run Input, testability analysis)

### 3. Technical Implementation Details
**Add new sections for**:
- Build versioning system (`SB_RUN_BUILD_ID`)
- Testability heuristic patterns and version tracking
- DoR/Eval separation with single source of truth
- Lovable AI Gateway integration

### 4. Data Model
**Update**: Clarify the current tables in use and their purpose

### 5. Getting Started
**Add**: Instructions for running and testing the application

## New README Structure

```text
1. Title and Description (updated)
2. What This Project Demonstrates (updated with implemented features)
3. Core Design Principles (keep, still accurate)
4. Architecture Overview (updated - no Python service)
5. Key Features (new section)
   - Story Generation
   - Definition of Ready (DoR)
   - Evaluations
   - Model Comparison
   - Debug Tools
6. Technical Implementation
   - Edge Function (sb-run)
   - Testability Heuristics
   - Build Versioning
7. Data Model (updated)
8. UI Components
9. Getting Started
10. Security & Secrets
11. Status & Roadmap
```

## Content Details

### Architecture Diagram Update
```text
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

### Key Features to Document
1. **Story Generation**: Takes role/goal/benefit inputs, generates structured user stories
2. **DoR Gate**: Enforces testability threshold (50% of ACs must match patterns)
3. **Eval Dimensions**: Clarity, Testability, Completeness, Specificity, Scope
4. **Compare Mode**: Side-by-side OpenAI vs Gemini output comparison
5. **Debug Tools**: View Run Input modal with messages and payload tabs

### Technical Details to Include
- 8 testability heuristic patterns with version tracking
- Build ID system for deployment verification
- Tool-calling enforcement (no response_format)
- Secret redaction in debug payloads

## File Changes

| File | Action |
|------|--------|
| `README.md` | Replace entire content with updated version |

## Implementation Notes
- Keep the professional tone and structure
- Maintain the "AI with Aimee" portfolio branding
- Preserve the distinction between DoR (gate) and Evals (measurement)
- Document current build version: `2026-01-07c`
- Document testability heuristic version: `2026-01-07a`

