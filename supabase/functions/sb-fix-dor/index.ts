import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ----- Duplicated from sb-run (source of truth) -----
const TESTABILITY_HEURISTIC_VERSION = "2026-01-07a";

const TESTABILITY_PATTERNS = {
  actionVerbPrefix: /^(user(s)? can|system|given|when|then|verify|ensure|check|validate|confirm|display|show|allow|prevent|enable|disable|must|should|shall|the user|the system|a user)/i,
  conditionalTemporal: /^(if|invalid|valid|on|upon|after|before|during|while|once|unless|following|prior to)\b/i,
  actionVerbsAnywhere: /^[A-Z][a-z]+(\s+[a-z]+)?\s+(with|in|out|up|on|off|to|from|into|for|at|by|using|via|through|requests?|actions?|attempts?|clears?|loads?|shows?|displays?|returns?|triggers?|creates?|updates?|deletes?|sends?|receives?|stores?|retrieves?|validates?|succeeds?|fails?|completes?)\b/i,
  securityTerms: /\b(https|http-only|httponly|samesite|secure cookie|encrypted|hashed|authenticated|authorized|ssl|tls|csrf|xss|sanitized|escaped|token|jwt|oauth|session)\b/i,
  performanceBounds: /\b(within|under|less than|at most|maximum|max|at least|minimum|min|<|>|≤|≥)\s*\d+\s*(ms|milliseconds?|seconds?|s|minutes?|m|%|percent)?\b/i,
  passiveVerifiable: /\b(is|are|was|were|been|being)\s+(transmitted|stored|logged|displayed|shown|hidden|validated|checked|verified|saved|deleted|created|updated|sent|received|processed|encrypted|hashed|cached|loaded|rendered|accessible|cleared|returned|redirected|maintained|preserved|retained)\b/i,
  stateOutcomeVerbs: /\b(remains|stays|becomes|appears|disappears|shows|hides|contains|includes|excludes|matches|equals|returns|responds|redirects|navigates|transitions|loads|clears|resets|expires|succeeds|fails|completes|triggers|activates|deactivates)\b/i,
  negationPattern: /\b(do not|does not|doesn't|will not|won't|never|cannot|can't|prevent|block|deny|reject|forbid)\b/i,
};

type TestabilityDebug = {
  heuristicVersion: string;
  totalAC: number;
  testableCount: number;
  testableRatio: number;
  threshold: number;
  passed: boolean;
  acDetails: Array<{
    acIndex: number;
    acText: string;
    matchedPatterns: string[];
    isTestable: boolean;
  }>;
};

function analyzeACTestability(ac: string): { isTestable: boolean; matchedPatterns: string[] } {
  const text = ac.trim();
  const lower = text.toLowerCase();
  const matchedPatterns: string[] = [];
  if (TESTABILITY_PATTERNS.actionVerbPrefix.test(text)) matchedPatterns.push("actionVerbPrefix");
  if (TESTABILITY_PATTERNS.conditionalTemporal.test(text)) matchedPatterns.push("conditionalTemporal");
  if (TESTABILITY_PATTERNS.actionVerbsAnywhere.test(text)) matchedPatterns.push("actionVerbsAnywhere");
  if (TESTABILITY_PATTERNS.securityTerms.test(lower)) matchedPatterns.push("securityTerms");
  if (TESTABILITY_PATTERNS.performanceBounds.test(lower)) matchedPatterns.push("performanceBounds");
  if (TESTABILITY_PATTERNS.passiveVerifiable.test(lower)) matchedPatterns.push("passiveVerifiable");
  if (TESTABILITY_PATTERNS.stateOutcomeVerbs.test(lower)) matchedPatterns.push("stateOutcomeVerbs");
  if (TESTABILITY_PATTERNS.negationPattern.test(lower)) matchedPatterns.push("negationPattern");
  return { isTestable: matchedPatterns.length > 0, matchedPatterns };
}

function computeTestabilityDebug(acceptanceCriteria: string[]): TestabilityDebug {
  const acDetails: TestabilityDebug["acDetails"] = [];
  let testableCount = 0;
  acceptanceCriteria.forEach((ac, idx) => {
    const analysis = analyzeACTestability(ac);
    acDetails.push({
      acIndex: idx,
      acText: ac.slice(0, 120) + (ac.length > 120 ? "..." : ""),
      matchedPatterns: analysis.matchedPatterns,
      isTestable: analysis.isTestable,
    });
    if (analysis.isTestable) testableCount++;
  });
  const totalAC = acceptanceCriteria.length;
  const testableRatio = totalAC > 0 ? testableCount / totalAC : 0;
  const threshold = 0.5;
  return {
    heuristicVersion: TESTABILITY_HEURISTIC_VERSION,
    totalAC,
    testableCount,
    testableRatio: Math.round(testableRatio * 100) / 100,
    threshold,
    passed: testableRatio >= threshold,
    acDetails,
  };
}

function runDoRValidation(
  story: { title: string; description: string; acceptance_criteria: string[] },
  testabilityDebug: TestabilityDebug
): { passed: boolean; fail_reasons: string[]; testability_debug: TestabilityDebug } {
  const fail_reasons: string[] = [];
  if (!story.title || story.title.length < 3) fail_reasons.push("Title is missing or too short");
  const descLower = story.description?.toLowerCase() || "";
  if (!descLower.includes("as a") || !descLower.includes("want") || !descLower.includes("so that"))
    fail_reasons.push("Description does not follow 'As a [role], I want [goal], so that [benefit]' format");
  if (!story.acceptance_criteria || story.acceptance_criteria.length < 3)
    fail_reasons.push(`Insufficient acceptance criteria (${story.acceptance_criteria?.length || 0}, need 3-7)`);
  else if (story.acceptance_criteria.length > 7)
    fail_reasons.push(`Too many acceptance criteria (${story.acceptance_criteria.length}, max 7)`);
  if (!testabilityDebug.passed) fail_reasons.push("Less than half of acceptance criteria appear testable");
  return { passed: fail_reasons.length === 0, fail_reasons, testability_debug: testabilityDebug };
}

function calculateEvalScores(
  story: { title: string; description: string; acceptance_criteria: string[] },
  dorResult: { passed: boolean; fail_reasons: string[]; testability_debug: TestabilityDebug }
) {
  const flags: string[] = [];
  const explanations: Record<string, string[]> = {};

  const descLower = story.description?.toLowerCase() || "";
  let clarity = 3;
  if (descLower.includes("as a") && descLower.includes("want") && descLower.includes("so that")) clarity = 5;
  else if (descLower.includes("want") || descLower.includes("need")) clarity = 4;

  const testabilityDebug = dorResult.testability_debug;
  const testableRatio = testabilityDebug.testableRatio;
  const testability = testabilityDebug.totalAC > 0 ? Math.min(5, 2 + Math.round(testableRatio * 3)) : 2;

  const unclearAcIndices: number[] = testabilityDebug.acDetails.filter((ac) => !ac.isTestable).map((ac) => ac.acIndex);

  const acCount = story.acceptance_criteria?.length || 0;
  let completeness = 3;
  if (acCount >= 5) completeness = 5;
  else if (acCount >= 3) completeness = 4;
  else if (acCount >= 1) completeness = 2;
  else completeness = 1;

  const titleLen = story.title?.length || 0;
  const descLen = story.description?.length || 0;
  let scope = 4;
  if (titleLen < 10 || titleLen > 100) scope = 3;
  if (descLen < 30) scope = 3;
  if (descLen > 500) { scope = 3; flags.push("broad_requirements"); }

  const consistency = dorResult.passed ? 4 : 3;
  const overall = Math.round(((clarity + testability + completeness + scope + consistency) / 5) * 10) / 10;
  const needs_review = overall < 4 || testability < 3 || completeness < 3 || !dorResult.passed;

  if (testability < 3) {
    flags.push("unclear_acceptance_criteria");
    explanations["unclear_acceptance_criteria"] = ["Some acceptance criteria lack clear testable patterns."];
  }
  if (completeness < 3) flags.push("missing_edge_cases");
  if (!dorResult.passed) {
    flags.push("dor_failed");
    explanations["dor_failed"] = dorResult.fail_reasons;
  }

  const result: any = {
    overall,
    needs_review,
    dimensions: { clarity, testability, completeness, scope, consistency },
    flags,
  };
  if (Object.keys(explanations).length > 0) result.explanations = explanations;
  if (flags.includes("unclear_acceptance_criteria") && unclearAcIndices.length > 0) result.unclear_ac_indices = unclearAcIndices;
  return result;
}
// ----- End duplicated logic -----

const STORY_SCHEMA = {
  type: "function",
  function: {
    name: "generate_user_story",
    description: "Generate a structured user story with improved testable acceptance criteria",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        acceptance_criteria: { type: "array", items: { type: "string" } },
      },
      required: ["title", "description", "acceptance_criteria"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { final_story, fail_reasons, model_id } = await req.json();

    if (!final_story || !fail_reasons || !model_id) {
      return new Response(JSON.stringify({ error: "Missing required fields: final_story, fail_reasons, model_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lovableModelId = model_id.replace(":", "/");

    // Build a targeted prompt focusing on fixing the specific DoR failures
    const untestableACs = final_story.acceptance_criteria
      .filter((_: string, idx: number) => {
        const analysis = analyzeACTestability(final_story.acceptance_criteria[idx]);
        return !analysis.isTestable;
      })
      .map((ac: string, idx: number) => `  ${idx + 1}. "${ac}"`)
      .join("\n");

    const systemPrompt = `You are an expert at writing testable acceptance criteria for user stories.

A story failed the Definition of Ready (DoR) check for these reasons:
${fail_reasons.map((r: string) => `- ${r}`).join("\n")}

The following acceptance criteria were flagged as NOT testable:
${untestableACs}

Testable acceptance criteria MUST match at least one of these patterns:
- Start with action verb prefixes: "User can", "System", "Given/When/Then", "Verify", "Ensure", "The user"
- Start with conditional/temporal words: "If", "After", "Before", "When", "Once"
- Use passive-verifiable forms: "is stored", "is displayed", "is validated"
- Include state/outcome verbs: "remains", "appears", "redirects", "contains", "loads"
- Include security terms: "authenticated", "encrypted", "HTTPS"
- Include performance bounds: "within 2 seconds", "under 500ms"
- Use negation patterns: "cannot", "does not", "prevents"

Your task:
1. Keep the title and description UNCHANGED
2. Rewrite ONLY the untestable acceptance criteria to be testable while preserving their intent
3. Keep already-testable criteria unchanged
4. Return 3-7 acceptance criteria total`;

    const userMessage = `Fix this story's acceptance criteria:

Title: ${final_story.title}
Description: ${final_story.description}

Current acceptance criteria:
${final_story.acceptance_criteria.map((ac: string, i: number) => `${i + 1}. ${ac}`).join("\n")}`;

    const payload = {
      model: lovableModelId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      tools: [STORY_SCHEMA],
      tool_choice: { type: "function", function: { name: "generate_user_story" } },
    };

    console.log(`[sb-fix-dor] calling AI model=${lovableModelId}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[sb-fix-dor] LLM error: ${response.status} ${errorText}`);
      const status = response.status === 429 || response.status === 402 ? response.status : 500;
      return new Response(
        JSON.stringify({ error: response.status === 429 ? "Rate limit exceeded" : response.status === 402 ? "Payment required" : `LLM error: ${response.status}` }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();

    // Parse tool call response
    let fixedStory: { title: string; description: string; acceptance_criteria: string[] } | null = null;

    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        fixedStory = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error("[sb-fix-dor] failed to parse tool call");
      }
    }

    // Fallback: parse content
    if (!fixedStory) {
      const content = result.choices?.[0]?.message?.content;
      if (content) {
        try {
          fixedStory = JSON.parse(content);
        } catch {
          const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (jsonMatch) {
            try { fixedStory = JSON.parse(jsonMatch[1].trim()); } catch { /* */ }
          }
        }
      }
    }

    if (!fixedStory || !fixedStory.acceptance_criteria?.length) {
      return new Response(JSON.stringify({ error: "Failed to parse fixed story from AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enforce: keep title and description from original
    fixedStory.title = final_story.title;
    fixedStory.description = final_story.description;

    // Clamp ACs to 3-7
    if (fixedStory.acceptance_criteria.length > 7) {
      fixedStory.acceptance_criteria = fixedStory.acceptance_criteria.slice(0, 7);
    }

    // Re-run DoR and eval on fixed story
    const testabilityDebug = computeTestabilityDebug(fixedStory.acceptance_criteria);
    const dorResult = runDoRValidation(fixedStory, testabilityDebug);
    const evalResult = calculateEvalScores(fixedStory, dorResult);

    console.log(`[sb-fix-dor] fix complete. DoR passed=${dorResult.passed} testable=${testabilityDebug.testableCount}/${testabilityDebug.totalAC}`);

    return new Response(
      JSON.stringify({
        fixed_story: fixedStory,
        dor: {
          passed: dorResult.passed,
          iterations: 1,
          fail_reasons: dorResult.fail_reasons,
        },
        eval: evalResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[sb-fix-dor] error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
