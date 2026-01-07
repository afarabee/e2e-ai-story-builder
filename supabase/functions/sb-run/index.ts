import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type RunResult = {
  run_id: string;
  model_id: string;
  final_story: {
    title: string;
    description: string;
    acceptance_criteria: string[];
  };
  dor: {
    passed: boolean;
    iterations: number;
    fail_reasons: string[];
  };
  eval: {
    overall: number;
    needs_review: boolean;
    dimensions: Record<string, number>;
    flags: string[];
  };
  debug?: {
    llm_request: {
      provider: string;
      model: string;
      prompt_version: string;
      messages: Array<{ role: string; content: string }>;
      payload: unknown;
    };
    llm_error?: string;
  };
};

// JSON schema for tool calling - forces structured output
const STORY_SCHEMA = {
  type: "function",
  function: {
    name: "generate_user_story",
    description: "Generate a structured user story with title, description in 'As a [role], I want [goal], so that [benefit]' format, and 3-7 testable acceptance criteria",
    parameters: {
      type: "object",
      properties: {
        title: { 
          type: "string", 
          description: "A clear, concise title for the user story (5-10 words)" 
        },
        description: { 
          type: "string", 
          description: "User story in 'As a [role], I want [goal], so that [benefit]' format" 
        },
        acceptance_criteria: { 
          type: "array", 
          items: { type: "string" },
          description: "3-7 testable acceptance criteria as bullet points"
        }
      },
      required: ["title", "description", "acceptance_criteria"],
      additionalProperties: false
    }
  }
};

// Sensitive keys to redact (case-insensitive) - expanded list
const SENSITIVE_KEYS = /api[_-]?key|token|authorization|secret|password|cookie|session|refresh|jwt|bearer|private|signature/i;
const MAX_TEXT_LENGTH = 10000;

function redactSecrets(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  
  // Truncate long strings
  if (typeof obj === 'string') {
    return obj.length > MAX_TEXT_LENGTH 
      ? obj.slice(0, MAX_TEXT_LENGTH) + '...[truncated]' 
      : obj;
  }
  
  // Recurse arrays
  if (Array.isArray(obj)) {
    return obj.map(item => redactSecrets(item));
  }
  
  // Recurse objects, redact sensitive keys, DROP headers entirely
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      // Drop headers entirely
      if (key.toLowerCase() === 'headers') continue;
      
      // Redact sensitive keys
      if (SENSITIVE_KEYS.test(key)) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redactSecrets(value);
      }
    }
    return result;
  }
  
  return obj;
}

// Fill template placeholders with whitespace tolerance: {{ key }} or {{key}}
function fillPromptTemplate(template: string, inputs: Record<string, string>): string {
  let filled = template;
  for (const [key, value] of Object.entries(inputs)) {
    // Escape regex special chars in key, allow optional whitespace around key
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const placeholder = new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'g');
    filled = filled.replace(placeholder, value || '[none]');
  }
  return filled;
}

// Call Lovable AI Gateway
async function callLovableAI(
  modelId: string, 
  messages: Array<{ role: string; content: string }>,
  requestId: string
): Promise<{ success: boolean; data?: { title: string; description: string; acceptance_criteria: string[] }; error?: string; payload?: unknown }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return { success: false, error: "LOVABLE_API_KEY not configured" };
  }

  // Map model IDs to Lovable AI format: "openai:gpt-5-nano" -> "openai/gpt-5-nano"
  const lovableModelId = modelId.replace(":", "/");

  const payload = {
    model: lovableModelId,
    messages,
    tools: [STORY_SCHEMA],
    tool_choice: { type: "function", function: { name: "generate_user_story" } }
  };

  try {
    console.log(`[sb-run] requestId=${requestId} calling Lovable AI model=${lovableModelId}`);
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[sb-run] requestId=${requestId} LLM error: ${response.status} ${errorText}`);
      
      if (response.status === 429) {
        return { success: false, error: "Rate limit exceeded, please try again later", payload };
      }
      if (response.status === 402) {
        return { success: false, error: "Payment required, please add credits to workspace", payload };
      }
      return { success: false, error: `LLM API error: ${response.status}`, payload };
    }

    const result = await response.json();
    
    // Extract tool call response (primary path)
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        console.log(`[sb-run] requestId=${requestId} parsed tool call response`);
        return { success: true, data: parsed, payload };
      } catch (parseErr) {
        console.error(`[sb-run] requestId=${requestId} failed to parse tool call arguments:`, parseErr);
      }
    }

    // Fallback: try to parse content directly as JSON
    const content = result.choices?.[0]?.message?.content;
    if (content) {
      try {
        // Try direct JSON parse
        const parsed = JSON.parse(content);
        console.log(`[sb-run] requestId=${requestId} parsed content as JSON fallback`);
        return { success: true, data: parsed, payload };
      } catch {
        // Try to extract JSON from markdown code block
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1].trim());
            console.log(`[sb-run] requestId=${requestId} parsed JSON from markdown block`);
            return { success: true, data: parsed, payload };
          } catch {
            // Fall through
          }
        }
        return { success: false, error: "Failed to parse LLM response as JSON", payload };
      }
    }

    return { success: false, error: "No valid response from LLM", payload };
  } catch (err) {
    console.error(`[sb-run] requestId=${requestId} LLM call failed:`, err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error", payload };
  }
}

// Validate story structure
function validateStory(story: unknown): { valid: boolean; issues: string[]; normalized?: { title: string; description: string; acceptance_criteria: string[] } } {
  const issues: string[] = [];
  
  if (!story || typeof story !== 'object') {
    return { valid: false, issues: ["Response is not an object"] };
  }

  const s = story as Record<string, unknown>;
  
  const title = typeof s.title === 'string' && s.title.trim().length >= 3 ? s.title.trim() : null;
  const description = typeof s.description === 'string' && s.description.trim().length >= 10 ? s.description.trim() : null;
  
  if (!title) issues.push("Missing or invalid title");
  if (!description) issues.push("Missing or invalid description");
  
  // Normalize acceptance_criteria to string array
  let acceptance_criteria: string[] = [];
  if (Array.isArray(s.acceptance_criteria)) {
    acceptance_criteria = s.acceptance_criteria
      .filter(c => typeof c === 'string' && c.trim().length > 0)
      .map(c => (c as string).trim())
      .slice(0, 7);
  }
  
  if (acceptance_criteria.length < 3) {
    issues.push(`Only ${acceptance_criteria.length} acceptance criteria (need 3-7)`);
  }
  
  if (title && description && acceptance_criteria.length >= 3) {
    return { 
      valid: true, 
      issues: [], 
      normalized: { title, description, acceptance_criteria } 
    };
  }
  
  // Partial success: have title/description but not enough ACs
  if (title && description) {
    return {
      valid: false,
      issues,
      normalized: { title, description, acceptance_criteria }
    };
  }
  
  return { valid: false, issues };
}

// Repair acceptance criteria with a focused LLM call
async function repairAcceptanceCriteria(
  story: { title: string; description: string },
  modelId: string,
  requestId: string
): Promise<{ success: boolean; criteria: string[]; error?: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return { success: false, criteria: [], error: "LOVABLE_API_KEY not configured" };
  }

  const lovableModelId = modelId.replace(":", "/");

  const repairPayload = {
    model: lovableModelId,
    messages: [
      {
        role: "system",
        content: "You are an expert at writing testable acceptance criteria for user stories. Return ONLY a JSON array of 5 acceptance criteria strings, no other text."
      },
      {
        role: "user",
        content: `Generate exactly 5 testable acceptance criteria for this user story:

Title: ${story.title}
Description: ${story.description}

Return ONLY a JSON array of 5 strings. Example format:
["User can...", "System validates...", "Error message shows...", "Data is saved...", "UI updates..."]`
      }
    ],
    response_format: { type: "json_object" }
  };

  try {
    console.log(`[sb-run] requestId=${requestId} repair AC call for model=${lovableModelId}`);
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(repairPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[sb-run] requestId=${requestId} repair call error: ${response.status}`);
      return { success: false, criteria: [], error: `Repair API error: ${response.status}` };
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    
    if (content) {
      try {
        const parsed = JSON.parse(content);
        // Handle both direct array and { acceptance_criteria: [...] } formats
        const arr = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.acceptance_criteria) ? parsed.acceptance_criteria : null);
        if (arr && arr.length >= 3) {
          const criteria = arr.filter((c: unknown) => typeof c === 'string').slice(0, 7);
          if (criteria.length >= 3) {
            console.log(`[sb-run] requestId=${requestId} repair succeeded with ${criteria.length} ACs`);
            return { success: true, criteria };
          }
        }
      } catch {
        // Try extracting array from text
        const match = content.match(/\[[\s\S]*\]/);
        if (match) {
          try {
            const arr = JSON.parse(match[0]);
            if (Array.isArray(arr) && arr.length >= 3) {
              const criteria = arr.filter((c: unknown) => typeof c === 'string').slice(0, 7);
              return { success: true, criteria };
            }
          } catch {
            // Fall through
          }
        }
      }
    }
    
    return { success: false, criteria: [], error: "Failed to parse repair response" };
  } catch (err) {
    console.error(`[sb-run] requestId=${requestId} repair call failed:`, err);
    return { success: false, criteria: [], error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// Run DoR validation on generated story
function runDoRValidation(story: { title: string; description: string; acceptance_criteria: string[] }, llmError?: string): { passed: boolean; fail_reasons: string[] } {
  const fail_reasons: string[] = [];
  
  // If LLM errored, DoR fails
  if (llmError) {
    fail_reasons.push(`LLM error: ${llmError}`);
  }
  
  // Title validation
  if (!story.title || story.title.length < 3) {
    fail_reasons.push("Title is missing or too short");
  }
  
  // Description format validation - should follow "As a... I want... so that..." pattern
  const descLower = story.description?.toLowerCase() || '';
  if (!descLower.includes('as a') || !descLower.includes('want') || !descLower.includes('so that')) {
    fail_reasons.push("Description does not follow 'As a [role], I want [goal], so that [benefit]' format");
  }
  
  // Acceptance criteria validation
  if (!story.acceptance_criteria || story.acceptance_criteria.length < 3) {
    fail_reasons.push(`Insufficient acceptance criteria (${story.acceptance_criteria?.length || 0}, need 3-7)`);
  } else if (story.acceptance_criteria.length > 7) {
    fail_reasons.push(`Too many acceptance criteria (${story.acceptance_criteria.length}, max 7)`);
  }
  
  // Check for testable ACs (should have action verbs)
  const actionVerbs = /^(user can|system|given|when|then|verify|ensure|check|validate|confirm|display|show|allow|prevent|enable|disable)/i;
  const testableCount = story.acceptance_criteria?.filter(ac => actionVerbs.test(ac.trim())).length || 0;
  if (story.acceptance_criteria && testableCount < Math.ceil(story.acceptance_criteria.length / 2)) {
    fail_reasons.push("Less than half of acceptance criteria appear testable");
  }
  
  return {
    passed: fail_reasons.length === 0,
    fail_reasons
  };
}

// Calculate eval scores from story quality
function calculateEvalScores(story: { title: string; description: string; acceptance_criteria: string[] }, dorResult: { passed: boolean; fail_reasons: string[] }, llmError?: string): {
  overall: number;
  needs_review: boolean;
  dimensions: Record<string, number>;
  flags: string[];
  explanations?: Record<string, string[]>;
  unclear_ac_indices?: number[];
  testability_debug?: {
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
} {
  const flags: string[] = [];
  const explanations: Record<string, string[]> = {};
  
  // If LLM errored, set low scores and flag
  if (llmError) {
    flags.push("llm_error");
    explanations["llm_error"] = [llmError];
    return {
      overall: 1.0,
      needs_review: true,
      dimensions: { clarity: 1, testability: 1, completeness: 1, scope: 1, consistency: 1 },
      flags,
      explanations
    };
  }
  
  // Calculate clarity score (based on description format)
  const descLower = story.description?.toLowerCase() || '';
  let clarity = 3;
  if (descLower.includes('as a') && descLower.includes('want') && descLower.includes('so that')) {
    clarity = 5;
  } else if (descLower.includes('want') || descLower.includes('need')) {
    clarity = 4;
  }
  
  // Calculate testability score (based on AC quality)
  // Version stamp for debugging which heuristic is running
  const TESTABILITY_HEURISTIC_VERSION = "2026-01-07a";
  
  // Pattern definitions with IDs for debug logging
  const testabilityPatterns = {
    actionVerbPrefix: /^(user(s)? can|system|given|when|then|verify|ensure|check|validate|confirm|display|show|allow|prevent|enable|disable|must|should|shall|the user|the system|a user)/i,
    conditionalTemporal: /^(if|invalid|valid|on|upon|after|before|during|while|once|unless|following|prior to)\b/i,
    actionVerbsAnywhere: /^[A-Z][a-z]+(\s+[a-z]+)?\s+(with|in|out|up|on|off|to|from|into|for|at|by|using|via|through|requests?|actions?|attempts?|clears?|loads?|shows?|displays?|returns?|triggers?|creates?|updates?|deletes?|sends?|receives?|stores?|retrieves?|validates?|succeeds?|fails?|completes?)\b/i,
    securityTerms: /\b(https|http-only|httponly|samesite|secure cookie|encrypted|hashed|authenticated|authorized|ssl|tls|csrf|xss|sanitized|escaped|token|jwt|oauth|session)\b/i,
    performanceBounds: /\b(within|under|less than|at most|maximum|max|at least|minimum|min|<|>|≤|≥)\s*\d+\s*(ms|milliseconds?|seconds?|s|minutes?|m|%|percent)?\b/i,
    passiveVerifiable: /\b(is|are|was|were|been|being)\s+(transmitted|stored|logged|displayed|shown|hidden|validated|checked|verified|saved|deleted|created|updated|sent|received|processed|encrypted|hashed|cached|loaded|rendered|accessible|cleared|returned|redirected|maintained|preserved|retained)\b/i,
    stateOutcomeVerbs: /\b(remains|stays|becomes|appears|disappears|shows|hides|contains|includes|excludes|matches|equals|returns|responds|redirects|navigates|transitions|loads|clears|resets|expires|succeeds|fails|completes|triggers|activates|deactivates)\b/i,
    negationPattern: /\b(do not|does not|doesn't|will not|won't|never|cannot|can't|prevent|block|deny|reject|forbid)\b/i,
  };
  
  // isTestableAC: Determines if an AC is testable and returns matched patterns for debugging
  const analyzeTestability = (ac: string): { isTestable: boolean; matchedPatterns: string[] } => {
    const text = ac.trim();
    const lower = text.toLowerCase();
    const matchedPatterns: string[] = [];
    
    if (testabilityPatterns.actionVerbPrefix.test(text)) matchedPatterns.push("actionVerbPrefix");
    if (testabilityPatterns.conditionalTemporal.test(text)) matchedPatterns.push("conditionalTemporal");
    if (testabilityPatterns.actionVerbsAnywhere.test(text)) matchedPatterns.push("actionVerbsAnywhere");
    if (testabilityPatterns.securityTerms.test(lower)) matchedPatterns.push("securityTerms");
    if (testabilityPatterns.performanceBounds.test(lower)) matchedPatterns.push("performanceBounds");
    if (testabilityPatterns.passiveVerifiable.test(lower)) matchedPatterns.push("passiveVerifiable");
    if (testabilityPatterns.stateOutcomeVerbs.test(lower)) matchedPatterns.push("stateOutcomeVerbs");
    if (testabilityPatterns.negationPattern.test(lower)) matchedPatterns.push("negationPattern");
    
    return {
      isTestable: matchedPatterns.length > 0,
      matchedPatterns,
    };
  };
  
  // Analyze each AC and build debug log
  const acAnalysis: Array<{
    acIndex: number;
    acText: string;
    matchedPatterns: string[];
    isTestable: boolean;
  }> = [];
  
  const unclearAcIndices: number[] = [];
  let testableCount = 0;
  
  story.acceptance_criteria?.forEach((ac, idx) => {
    const analysis = analyzeTestability(ac);
    acAnalysis.push({
      acIndex: idx,
      acText: ac.slice(0, 120) + (ac.length > 120 ? "..." : ""),
      matchedPatterns: analysis.matchedPatterns,
      isTestable: analysis.isTestable,
    });
    
    if (analysis.isTestable) {
      testableCount++;
    } else {
      unclearAcIndices.push(idx);
    }
  });
  
  const totalAC = story.acceptance_criteria?.length || 0;
  const testableRatio = totalAC > 0 ? testableCount / totalAC : 0;
  const testabilityThreshold = 0.5; // At least half must be testable for score >= 3
  const testabilityPassed = testableRatio >= testabilityThreshold;
  
  // Build testability debug summary
  const testabilityDebug = {
    heuristicVersion: TESTABILITY_HEURISTIC_VERSION,
    totalAC,
    testableCount,
    testableRatio: Math.round(testableRatio * 100) / 100,
    threshold: testabilityThreshold,
    passed: testabilityPassed,
    acDetails: acAnalysis,
  };
  
  console.log(`[sb-run] testability: version=${TESTABILITY_HEURISTIC_VERSION} total=${totalAC} testable=${testableCount} ratio=${testableRatio.toFixed(2)} passed=${testabilityPassed}`);
  
  const testability = totalAC > 0 ? Math.min(5, 2 + Math.round(testableRatio * 3)) : 2;
  
  // Calculate completeness score (based on AC count)
  const acCount = story.acceptance_criteria?.length || 0;
  let completeness = 3;
  if (acCount >= 5) completeness = 5;
  else if (acCount >= 3) completeness = 4;
  else if (acCount >= 1) completeness = 2;
  else completeness = 1;
  
  // Scope score (based on title/description length balance)
  const titleLen = story.title?.length || 0;
  const descLen = story.description?.length || 0;
  let scope = 4;
  if (titleLen < 10 || titleLen > 100) scope = 3;
  if (descLen < 30) scope = 3;
  if (descLen > 500) {
    scope = 3;
    flags.push("broad_requirements");
  }
  
  // Consistency score (all ACs should relate to description)
  const consistency = dorResult.passed ? 4 : 3;
  
  const overall = Math.round(((clarity + testability + completeness + scope + consistency) / 5) * 10) / 10;
  const needs_review = overall < 4 || testability < 3 || completeness < 3 || !dorResult.passed;
  
  // Add flags based on issues
  if (testability < 3) {
    flags.push("unclear_acceptance_criteria");
    explanations["unclear_acceptance_criteria"] = ["Some acceptance criteria lack clear testable patterns. Good ACs include: action verbs, conditional outcomes, security/performance constraints, or verifiable state changes."];
  }
  if (completeness < 3) flags.push("missing_edge_cases");
  if (!dorResult.passed) {
    flags.push("dor_failed");
    explanations["dor_failed"] = dorResult.fail_reasons;
  }
  
  // Build result with optional fields
  const result: {
    overall: number;
    needs_review: boolean;
    dimensions: Record<string, number>;
    flags: string[];
    explanations?: Record<string, string[]>;
    unclear_ac_indices?: number[];
    testability_debug?: typeof testabilityDebug;
  } = {
    overall,
    needs_review,
    dimensions: { clarity, testability, completeness, scope, consistency },
    flags
  };
  
  // Only include explanations if we have any
  if (Object.keys(explanations).length > 0) {
    result.explanations = explanations;
  }
  
  // Only include unclear_ac_indices if the flag is set AND we have indices
  if (flags.includes("unclear_acceptance_criteria") && unclearAcIndices.length > 0) {
    result.unclear_ac_indices = unclearAcIndices;
  }
  
  // Always include testability debug for runtime proof
  result.testability_debug = testabilityDebug;
  
  return result;
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[sb-run] requestId=${requestId}`);

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Auth is OPTIONAL for demo mode
    const authHeader = req.headers.get("Authorization") ?? "";
    const { data: authData } = await supabase.auth.getUser(authHeader);
    const userId = authData?.user?.id ?? null;

    const body = await req.json();
    const {
      raw_input,
      project_settings = {},
      run_mode = "single",
      models = [],
    } = body;

    const customPrompt: string =
      typeof project_settings?.customPrompt === "string"
        ? project_settings.customPrompt
        : "";

    // Default models based on run_mode (using cheapest options)
    const DEFAULT_SINGLE_MODEL = "openai:gpt-5-nano";
    const DEFAULT_COMPARE_MODELS = [
      "openai:gpt-5-nano",
      "google:gemini-2.5-flash-lite",
    ];

    const effectiveModels: string[] =
      models.length > 0
        ? models
        : run_mode === "compare"
          ? DEFAULT_COMPARE_MODELS
          : [DEFAULT_SINGLE_MODEL];

    const comparisonGroupId = run_mode === "compare" ? crypto.randomUUID() : null;

    const rawInputStr = typeof raw_input === "string" ? raw_input : "";
    const rawInputTrimmed = rawInputStr.trim();
    const rawPreview = rawInputTrimmed.slice(0, 120);

    console.log(
      `[sb-run] requestId=${requestId} run_mode=${run_mode} models=${effectiveModels.join(",")} raw_len=${rawInputTrimmed.length} raw_preview="${rawPreview.replace(/\n/g, " ")}"`,
    );

    // Create session first (required by foreign key constraint)
    const { data: session, error: sessionError } = await supabase
      .from("sb_sessions")
      .insert({
        title: rawInputTrimmed?.substring(0, 100) || "New Story",
        status: "active",
        context_defaults: project_settings,
      })
      .select()
      .single();

    if (sessionError) {
      console.error("Session insert error:", sessionError);
      throw sessionError;
    }

    const sessionId = session.id;

    // Fetch active prompt version, fallback to most recent
    let promptTemplate = 'Generate a user story based on the following input. Return JSON with title, description (in "As a [role], I want [goal], so that [benefit]" format), and acceptance_criteria (array of 3-7 testable criteria).';
    let promptVersionName = 'default';

    try {
      const { data: activeVersion, error: activeError } = await supabase
        .from('sb_prompt_versions')
        .select('id, name, template')
        .eq('status', 'active')
        .single();

      if (activeVersion && !activeError) {
        promptTemplate = activeVersion.template;
        promptVersionName = activeVersion.name;
        console.log(`[sb-run] requestId=${requestId} using active prompt: ${promptVersionName}`);
      } else {
        const { data: fallbackVersion, error: fallbackError } = await supabase
          .from('sb_prompt_versions')
          .select('id, name, template')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (fallbackVersion && !fallbackError) {
          promptTemplate = fallbackVersion.template;
          promptVersionName = fallbackVersion.name;
          console.log(`[sb-run] requestId=${requestId} no active prompt, using fallback: ${promptVersionName}`);
        } else {
          console.log(`[sb-run] requestId=${requestId} no prompt versions found, using default`);
        }
      }
    } catch (promptFetchError) {
      console.error(`[sb-run] requestId=${requestId} prompt fetch error (non-fatal):`, promptFetchError);
    }

    // Extract file content text from uploaded files (truncated)
    const extractedFileText = (project_settings?.fileContent || project_settings?.file_content || '').toString().slice(0, MAX_TEXT_LENGTH);

    // Process each model (async loop for LLM calls)
    const runs: RunResult[] = [];

    for (let modelIndex = 0; modelIndex < effectiveModels.length; modelIndex++) {
      const modelId = effectiveModels[modelIndex];
      const runId = crypto.randomUUID();
      
      const isOpenAI = modelId.toLowerCase().includes("openai");
      const isGemini = modelId.toLowerCase().includes("gemini") || modelId.toLowerCase().includes("google");
      const variant_id = isOpenAI ? "OPENAI_A" : isGemini ? "GEMINI_B" : `VARIANT_${modelIndex}`;

      // Build template inputs
      const templateInputs: Record<string, string> = {
        project_name: project_settings?.projectName || project_settings?.project_name || '[none]',
        project_description: project_settings?.projectDescription || project_settings?.project_description || '[none]',
        persona: project_settings?.persona || '[none]',
        tone: project_settings?.tone || '[none]',
        format: project_settings?.format || '[none]',
        raw_input: rawInputTrimmed.slice(0, MAX_TEXT_LENGTH),
        custom_prompt: customPrompt || '[none]',
        file_content: extractedFileText || '[none]',
        project_context: project_settings?.technicalContext || project_settings?.project_context || project_settings?.additionalContext || '[none]',
      };

      // Fill the prompt template
      const filledSystemPrompt = fillPromptTemplate(promptTemplate, templateInputs);
      
      // Append JSON instruction to system prompt
      const systemPromptWithJsonInstruction = `${filledSystemPrompt}

IMPORTANT: You MUST respond with valid JSON only. The response must be a JSON object with exactly these fields:
- "title": string (5-10 words, clear and concise)
- "description": string (in "As a [role], I want [goal], so that [benefit]" format)
- "acceptance_criteria": array of 3-7 strings (each being a testable acceptance criterion)

Do not include any text outside the JSON object.`;

      // Build messages for LLM
      const messages = [
        { role: 'system', content: systemPromptWithJsonInstruction },
        { role: 'user', content: rawInputTrimmed || '[empty input]' }
      ];

      // Build actual payload sent to LLM
      const actualLlmPayload = {
        model: modelId.replace(":", "/"),
        messages,
        tools: [STORY_SCHEMA],
        tool_choice: { type: "function", function: { name: "generate_user_story" } },
        response_format: { type: "json_object" }
      };

      // Call LLM
      const llmResult = await callLovableAI(modelId, messages, requestId);
      
      let finalStory: { title: string; description: string; acceptance_criteria: string[] };
      let llmError: string | undefined;
      let iterations = 1;

      if (llmResult.success && llmResult.data) {
        // Validate the response
        const validation = validateStory(llmResult.data);
        
        if (validation.valid && validation.normalized) {
          finalStory = validation.normalized;
          console.log(`[sb-run] requestId=${requestId} model=${modelId} story valid`);
        } else if (validation.normalized?.title && validation.normalized?.description) {
          // Has title/description but needs AC repair
          console.log(`[sb-run] requestId=${requestId} model=${modelId} needs AC repair: ${validation.issues.join(", ")}`);
          iterations = 2;
          
          const repairResult = await repairAcceptanceCriteria(
            { title: validation.normalized.title, description: validation.normalized.description },
            modelId,
            requestId
          );
          
          if (repairResult.success && repairResult.criteria.length >= 3) {
            finalStory = {
              title: validation.normalized.title,
              description: validation.normalized.description,
              acceptance_criteria: repairResult.criteria
            };
          } else {
            // Repair failed - return empty ACs and mark for review (FIX #1: no generic fallback)
            llmError = `AC repair failed: ${repairResult.error || 'insufficient criteria'}`;
            finalStory = {
              title: validation.normalized.title,
              description: validation.normalized.description,
              acceptance_criteria: [] // Empty, not generic fallback
            };
          }
        } else {
          // Complete failure - no usable output (FIX #1: no generic fallback)
          llmError = `Invalid LLM response: ${validation.issues.join(", ")}`;
          finalStory = {
            title: '',
            description: '',
            acceptance_criteria: []
          };
        }
      } else {
        // LLM call failed (FIX #1: no generic fallback)
        llmError = llmResult.error || "Unknown LLM error";
        console.error(`[sb-run] requestId=${requestId} model=${modelId} LLM failed: ${llmError}`);
        
        finalStory = {
          title: '',
          description: '',
          acceptance_criteria: []
        };
      }

      // FIX #2: Run actual DoR validation on the generated story
      const dorResult = runDoRValidation(finalStory, llmError);
      
      // Calculate eval scores based on story quality
      const evalResult = calculateEvalScores(finalStory, dorResult, llmError);

      // Build debug object with ACTUAL payload sent (redacted) + testability debug
      const debug = {
        llm_request: {
          provider: modelId.split(':')[0] || 'unknown',
          model: modelId,
          prompt_version: promptVersionName,
          messages: redactSecrets(messages) as Array<{ role: string; content: string }>,
          payload: redactSecrets(actualLlmPayload),
        },
        llm_error: llmError,
        testability: evalResult.testability_debug,
      };

      const result: RunResult = {
        run_id: runId,
        model_id: modelId,
        final_story: finalStory,
        dor: {
          passed: dorResult.passed,
          iterations,
          fail_reasons: dorResult.fail_reasons,
        },
        eval: evalResult,
        debug,
      };

      console.log(
        `[sb-run] requestId=${requestId} run_id=${runId.slice(0, 8)} model=${modelId} dor_passed=${dorResult.passed} overall=${evalResult.overall} needs_review=${evalResult.needs_review} title="${finalStory.title?.slice(0, 50) || '[empty]'}"`,
      );

      runs.push(result);
    }

    const storyRows = runs.map((r) => ({
      session_id: sessionId,
      source: "llm",
      story: {
        title: r.final_story.title,
        description: r.final_story.description,
        acceptance_criteria: r.final_story.acceptance_criteria,
        model_id: r.model_id,
        raw_input,
        project_settings,
        dor: r.dor,
        eval: r.eval,
        debug: r.debug,
        comparison_group_id: comparisonGroupId,
        generated_at: new Date().toISOString(),
      },
    }));

    const { data: stories, error: insertError } = await supabase
      .from("sb_stories")
      .insert(storyRows)
      .select();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({
        session_id: sessionId,
        comparison_group_id: comparisonGroupId,
        runs: runs.map((r, idx) => ({
          ...r,
          story_id: stories?.[idx]?.id ?? null,
        })),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
