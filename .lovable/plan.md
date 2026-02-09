
# Update Fail DoR Custom Prompt Wording

## Change
Replace the `customPrompt` text in all three Fail DoR presets with the user's revised prompt that emphasizes subjective, qualitative language and user feelings.

## Presets to Update
1. `high-quality-refund` (line 81-86)
2. `medium-quality-address` (line 114-120)
3. `low-quality-notifications` (line 163-169)

## New Prompt Text
```
Write acceptance criteria using subjective, qualitative language. Focus on user feelings and experience quality rather than specific system behaviors. Use phrases like 'intuitive experience', 'seamless flow', 'good performance', 'appropriate feedback'. Do NOT use action verbs like 'can', 'should', 'must', 'displays', 'returns', 'validates'. Avoid measurable or verifiable criteria.
```

## Why This Is Better
The revised prompt:
- Explicitly steers toward **subjective/qualitative** language ("user feelings", "experience quality")
- Provides concrete example phrases that will dodge the testability heuristics
- Is more concise and direct in its instructions
- Covers the same verb avoidance but in a tighter formulation

## Technical Detail
Only `src/types/preset.ts` changes. The `customPrompt` field value is replaced in 3 locations. No backend changes needed.
