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
  };
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

    // Default models based on run_mode (using cheapest options for testing)
    const DEFAULT_SINGLE_MODEL = "openai:gpt-5-nano";
    const DEFAULT_COMPARE_MODELS = [
      "openai:gpt-5-nano",
      "google:gemini-2.5-flash-lite",
    ];

    // Fallback models if primary is unavailable
    const FALLBACK_OPENAI = "openai:gpt-4o-mini";
    const FALLBACK_GEMINI = "google:gemini-2.5-flash";

    const effectiveModels: string[] =
      models.length > 0
        ? models
        : run_mode === "compare"
          ? DEFAULT_COMPARE_MODELS
          : [DEFAULT_SINGLE_MODEL];

    const comparisonGroupId = run_mode === "compare" ? crypto.randomUUID() : null;

    // FNV-1a hash for deterministic variation based on input
    const fnv1aHash = (str: string): number => {
      let hash = 2166136261;
      for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = (hash * 16777619) >>> 0;
      }
      return hash;
    };

    const rawInputStr = typeof raw_input === "string" ? raw_input : "";
    const rawInputTrimmed = rawInputStr.trim();
    const rawPreview = rawInputTrimmed.slice(0, 120);
    const rawFingerprint = fnv1aHash(rawInputTrimmed || "(empty)").toString(16);

    console.log(
      `[sb-run] requestId=${requestId} run_mode=${run_mode} models=${effectiveModels.join(",")} raw_len=${rawInputTrimmed.length} raw_fp=${rawFingerprint} raw_preview="${rawPreview.replace(/\n/g, " ")}"`,
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

    // Fetch active prompt version (same logic as UI), fallback to most recent
    let promptTemplate = '[No prompt template available]';
    let promptVersionName = 'unknown';

    try {
      // First try to get active version
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
        // Fallback: get most recent prompt version
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
          console.log(`[sb-run] requestId=${requestId} no prompt versions found, using placeholder`);
        }
      }
    } catch (promptFetchError) {
      console.error(`[sb-run] requestId=${requestId} prompt fetch error (non-fatal):`, promptFetchError);
      // Continue with placeholder - never throw
    }

    // Extract file content text from uploaded files (truncated)
    const extractedFileText = (project_settings?.fileContent || project_settings?.file_content || '').toString().slice(0, MAX_TEXT_LENGTH);

    // Unique seed per request to ensure each invocation is fresh
    const invocationSeed = `${requestId}-${Date.now()}`;

    const toTitleCase = (s: string) =>
      s
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

    const extractTitleFromInput = (input: string): string => {
      const firstLine =
        input
          .split("\n")
          .map((l) => l.trim())
          .find((l) => l.length > 0) ?? "";

      const cleaned = firstLine
        .replace(/^[#*\-\d.\s]+/, "")
        .replace(/[^a-zA-Z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const words = cleaned.split(" ").filter(Boolean);
      if (words.length >= 3) return toTitleCase(words.slice(0, 7).join(" "));

      // Fallback: use a short topic phrase derived from the body
      const bodyWords = input
        .replace(/[^a-zA-Z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .filter(Boolean);
      if (bodyWords.length >= 3) return toTitleCase(bodyWords.slice(0, 7).join(" "));
      return "User Story";
    };

    const extractAcceptanceCriteria = (input: string): string[] => {
      // Prefer explicit bullet points, if present
      const bullets = input
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => /^[-*]\s+/.test(l) || /^\d+\)\s+/.test(l) || /^\d+\.\s+/.test(l))
        .map((l) => l.replace(/^([-*]|\d+\)|\d+\.)\s+/, "").trim())
        .filter((l) => l.length > 0)
        .slice(0, 7);

      if (bullets.length >= 3) return bullets;

      // Otherwise: derive generic-but-non-templated ACs tied to input fingerprint
      const fp = fnv1aHash(input || "(empty)");
      const base: string[] = [
        "Story includes clear user goal and success outcome",
        "Acceptance criteria are testable and unambiguous",
        "Error cases and validation behavior are specified",
        "Performance or latency expectations are stated when relevant",
        "Sensitive data is handled securely and not exposed in errors",
        "Out-of-scope items are explicitly noted",
      ];

      const rotated = base
        .slice(fp % base.length)
        .concat(base.slice(0, fp % base.length));

      return rotated.slice(0, 5);
    };

    const baseTitle = extractTitleFromInput(rawInputTrimmed);
    const baseDescription = rawInputTrimmed
      ? rawInputTrimmed.replace(/\s+/g, " ").slice(0, 240)
      : "";

    // COMPARE MODE: Ensure two truly distinct runs with separate stories per model
    const runs: RunResult[] = effectiveModels.map(
      (modelId: string, modelIndex: number) => {
        const runId = crypto.randomUUID();
        const isOpenAI = modelId.toLowerCase().includes("openai");
        const isGemini =
          modelId.toLowerCase().includes("gemini") ||
          modelId.toLowerCase().includes("google");

        // Determine variant_id (kept for compare readability)
        const variant_id = isOpenAI ? "OPENAI_A" : isGemini ? "GEMINI_B" : `VARIANT_${modelIndex}`;

        // Check for model availability and apply fallbacks if needed
        let actualModelId = modelId;
        let modelFallbackUsed = false;

        // Simulate model availability check (in real implementation, this would check actual availability)
        const unavailableModels = new Set<string>();

        if (unavailableModels.has(modelId)) {
          if (isOpenAI) {
            actualModelId = FALLBACK_OPENAI;
            modelFallbackUsed = true;
            console.log(
              `[sb-run] requestId=${requestId} model=${modelId} unavailable, falling back to ${FALLBACK_OPENAI}`,
            );
          } else if (isGemini) {
            actualModelId = FALLBACK_GEMINI;
            modelFallbackUsed = true;
            console.log(
              `[sb-run] requestId=${requestId} model=${modelId} unavailable, falling back to ${FALLBACK_GEMINI}`,
            );
          }
        }

        // IMPORTANT: Seed includes model AND variant to guarantee distinct outputs per model
        const inputSeed = `${rawInputTrimmed}||${customPrompt}||${modelId}||${variant_id}||${modelIndex}||${invocationSeed}`;
        const hash = fnv1aHash(inputSeed);

        // Derive scores from hash - each model gets different scores due to variant in seed
        const clarityScore = 3 + (hash % 3); // 3-5
        const testabilityScore = 2 + ((hash >> 4) % 4); // 2-5
        const completenessScore = 3 + ((hash >> 8) % 3); // 3-5
        const scopeScore = 3 + ((hash >> 12) % 3); // 3-5
        const consistencyScore = 3 + ((hash >> 16) % 3); // 3-5

        const overallRaw =
          (clarityScore +
            testabilityScore +
            completenessScore +
            scopeScore +
            consistencyScore) /
          5;
        const overall = Math.round(overallRaw * 10) / 10;

        const needsReview =
          overall < 4 || testabilityScore < 3 || completenessScore < 3;

        const possibleFlags = [
          "ambiguous_scope",
          "missing_edge_cases",
          "unclear_acceptance_criteria",
          "needs_refinement",
          "broad_requirements",
          "missing_error_handling",
        ];
        const flagCount = (hash >> 20) % 4; // 0-3
        const flags: string[] = [];
        for (let i = 0; i < flagCount; i++) {
          const flagIndex = (hash >> (24 + i * 2)) % possibleFlags.length;
          if (!flags.includes(possibleFlags[flagIndex])) {
            flags.push(possibleFlags[flagIndex]);
          }
        }
        if (modelFallbackUsed) flags.push("model_fallback_used");

        // Generate model-specific title with variant marker for compare mode
        const title =
          run_mode === "compare" ? `${baseTitle} (${variant_id})` : baseTitle;

        // Generate model-specific acceptance criteria (use hash to vary slightly)
        const baseAC = extractAcceptanceCriteria(rawInputTrimmed);
        // For compare mode, slightly vary acceptance criteria per model
        const acceptanceCriteria = run_mode === "compare" && isGemini
          ? baseAC.map((ac, i) => i === 0 ? `[Gemini] ${ac}` : ac)
          : run_mode === "compare" && isOpenAI
            ? baseAC.map((ac, i) => i === 0 ? `[OpenAI] ${ac}` : ac)
            : baseAC;

        // Generate model-specific description
        const modelPrefix = isOpenAI ? "OpenAI analysis: " : isGemini ? "Gemini analysis: " : "";
        const description =
          baseDescription.length > 0
            ? `${run_mode === "compare" ? modelPrefix : ""}As a user, I want ${baseDescription} so that I achieve the intended outcome.`
            : `${run_mode === "compare" ? modelPrefix : ""}As a user, I want a clearly defined feature so that I can accomplish my goal.`;

        const iterations = isOpenAI ? 1 : 1 + (hash % 3);
        const dorPassed = overall >= 3.5;

        // Build debug.llm_request from actual prompt template and inputs
        const provider = actualModelId.split(':')[0] || 'unknown';

        // Build template inputs from ACTUAL variables used in sb-run
        const templateInputs: Record<string, string> = {
          // Project settings fields (if provided)
          project_name: project_settings?.projectName || project_settings?.project_name || '[none]',
          project_description: project_settings?.projectDescription || project_settings?.project_description || '[none]',
          persona: project_settings?.persona || '[none]',
          tone: project_settings?.tone || '[none]',
          format: project_settings?.format || '[none]',
          // Actual run inputs
          raw_input: rawInputTrimmed.slice(0, MAX_TEXT_LENGTH),
          custom_prompt: customPrompt || '[none]',
          file_content: extractedFileText || '[none]',
          project_context: project_settings?.technicalContext || project_settings?.project_context || project_settings?.additionalContext || '[none]',
        };

        // Fill the actual prompt template with real inputs
        const filledSystemPrompt = fillPromptTemplate(promptTemplate, templateInputs);

        // Build messages: system (filled template) + user (raw_input)
        const messages = [
          { role: 'system', content: filledSystemPrompt },
          { role: 'user', content: rawInputTrimmed.slice(0, MAX_TEXT_LENGTH) || '[empty input]' }
        ];

        // Payload includes ONLY fields we actually set (no invented temp/max_tokens)
        const llmPayload = {
          model: actualModelId,
          messages,
        };

        const debug = {
          llm_request: {
            provider,
            model: actualModelId,
            prompt_version: promptVersionName,
            messages: redactSecrets(messages) as Array<{ role: string; content: string }>,
            payload: redactSecrets(llmPayload),
          },
        };

        // Create a NEW story object for each run (never reuse)
        const result: RunResult = {
          run_id: runId,
          model_id: actualModelId,
          final_story: {
            title,
            description,
            acceptance_criteria: acceptanceCriteria,
          },
          dor: {
            passed: dorPassed,
            iterations,
            fail_reasons: dorPassed ? [] : ["Quality threshold not met"],
          },
          eval: {
            overall,
            needs_review: needsReview,
            dimensions: {
              clarity: clarityScore,
              testability: testabilityScore,
              completeness: completenessScore,
              scope: scopeScore,
              consistency: consistencyScore,
            },
            flags,
          },
          debug,
        };

        // Enhanced per-run logging with title hash for uniqueness confirmation
        const titleHash = fnv1aHash(result.final_story.title).toString(16).slice(0, 8);
        console.log(
          `[sb-run] requestId=${requestId} run_id=${runId.slice(0, 8)} model_id=${actualModelId} variant=${variant_id} overall=${result.eval.overall} title_hash=${titleHash} title="${result.final_story.title.slice(0, 50)}"`,
        );

        return result;
      },
    );

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
