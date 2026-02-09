

# Plan: Update Presets for Reliable DoR Pass/Fail Demo

## Goal

Restructure the preset scenarios so that within each quality tier (High, Medium, Low), one preset reliably **passes** DoR and one reliably **fails** DoR. This gives a clear demo of the "Fix with AI" feature.

## Why Stories Currently Always Pass

The DoR gate marks an acceptance criterion as "testable" if it matches **any one** of 8 very broad regex patterns (e.g., starts with "User can", "System should", contains words like "returns", "displays", "validates", etc.). The threshold is only 50%. Modern LLMs naturally produce ACs that match these patterns, so virtually everything passes.

## Strategy to Force DoR Failures

The only reliable lever is the **custom prompt**. By instructing the LLM to write ACs in a deliberately vague, outcome-free style (no action verbs, no conditional logic, no security terms, no performance bounds), the generated ACs will dodge the heuristic patterns and fail DoR.

A "fail prompt" like the following will instruct the model to produce non-testable ACs:

```
Write acceptance criteria as high-level goals and aspirational qualities only.
Do NOT use action verbs like "user can", "system should", "display", "validate".
Do NOT start criteria with "Given", "When", "Then", "If", or "After".
Do NOT mention specific actions, verbs, or measurable outcomes.
Write each criterion as a broad principle or quality statement.
Example: "Good overall experience", "Appropriate level of security", "Intuitive flow".
```

## Preset Restructure

Each tier keeps two presets: one with no custom prompt (natural LLM output -- passes DoR), and one with the "fail prompt" (forces vague ACs -- fails DoR).

### High Quality Tier

| Preset | Expected DoR | Change |
|--------|-------------|--------|
| `High - Customer Login` | PASS | No change (already passes reliably) |
| `High - Refund Request` | FAIL | Add the fail-prompt as `customPrompt` to force vague ACs. Update description and name to `High - Refund Request (Fail DoR)` |

### Medium Quality Tier

| Preset | Expected DoR | Change |
|--------|-------------|--------|
| `Medium - Customer Login` | PASS | No change |
| `Medium - Shipping Address` | FAIL | Add the fail-prompt as `customPrompt`. Update name to `Medium - Shipping Address (Fail DoR)` |
| `Medium + Prompt - Customer Login` | Keep as-is | This preset demonstrates prompt improvement and still passes DoR, so it stays unchanged |

### Low Quality Tier

| Preset | Expected DoR | Change |
|--------|-------------|--------|
| `Low - Customer Login` | PASS | No change |
| `Low - Notifications` | FAIL | Add the fail-prompt as `customPrompt`. Update name to `Low - Notifications (Fail DoR)` |

### Compare Presets

No changes -- these are for model comparison, not DoR demo.

## File Changes

| File | Action |
|------|--------|
| `src/types/preset.ts` | Update 3 presets: add `customPrompt` with the fail-prompt to `high-quality-refund`, `medium-quality-address`, and `low-quality-notifications`. Update their `name` and `description` fields to indicate they are expected to fail DoR. |

## Technical Details

Only `src/types/preset.ts` is modified. The fail-prompt text is added to the `customPrompt` field of three existing presets. No backend or edge function changes are needed -- the custom prompt is already sent to the LLM as part of the generation request in `sb-run`.

The fail-prompt is designed to dodge all 8 `TESTABLE_PATTERNS` regexes:
- No `actionVerbPrefix` triggers (avoids "User can", "System", "Given/When/Then", etc.)
- No `conditionalTemporal` triggers (avoids "If", "After", "Before", etc.)
- No `actionVerbsAnywhere` triggers (avoids verb-preposition patterns)
- No `securityTerms` (avoids "encrypted", "hashed", "token", etc.)
- No `performanceBounds` (avoids "within 2 seconds", etc.)
- No `passiveVerifiable` (avoids "is stored", "is displayed", etc.)
- No `stateOutcomeVerbs` (avoids "returns", "redirects", "shows", etc.)
- No `negationPattern` (avoids "cannot", "does not", etc.)

With more than 50% of ACs failing all patterns, the DoR gate will reliably fail.

