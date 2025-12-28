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
};

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

    // Default models based on run_mode (using cheapest options for testing)
    const DEFAULT_SINGLE_MODEL = "openai:gpt-5-nano";
    const DEFAULT_COMPARE_MODELS = ["openai:gpt-5-nano", "google:gemini-2.5-flash-lite"];
    
    // Fallback models if primary is unavailable
    const FALLBACK_OPENAI = "openai:gpt-4o-mini";
    const FALLBACK_GEMINI = "google:gemini-2.5-flash";
    
    const effectiveModels: string[] =
      models.length > 0
        ? models
        : run_mode === "compare"
          ? DEFAULT_COMPARE_MODELS
          : [DEFAULT_SINGLE_MODEL];

    const comparisonGroupId =
      run_mode === "compare" ? crypto.randomUUID() : null;

    console.log(`[sb-run] requestId=${requestId} run_mode=${run_mode} models=${effectiveModels.join(",")}`);

    // Create session first (required by foreign key constraint)
    const { data: session, error: sessionError } = await supabase
      .from("sb_sessions")
      .insert({
        title: raw_input?.substring(0, 100) || "New Story",
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

    const runs: RunResult[] = effectiveModels.map((modelId: string) => {
      const isOpenAI = modelId.toLowerCase().includes("openai");
      const isGemini = modelId.toLowerCase().includes("gemini") || modelId.toLowerCase().includes("google");
      
      // Determine variant_id
      const variant_id = isOpenAI ? "OPENAI_A" : isGemini ? "GEMINI_B" : "UNKNOWN";
      
      // Check for model availability and apply fallbacks if needed
      let actualModelId = modelId;
      let modelFallbackUsed = false;
      
      // Simulate model availability check (in real implementation, this would check actual availability)
      const unavailableModels = new Set<string>(); // Add model IDs here if they become unavailable
      
      if (unavailableModels.has(modelId)) {
        if (isOpenAI) {
          actualModelId = FALLBACK_OPENAI;
          modelFallbackUsed = true;
          console.log(`[sb-run] requestId=${requestId} model=${modelId} unavailable, falling back to ${FALLBACK_OPENAI}`);
        } else if (isGemini) {
          actualModelId = FALLBACK_GEMINI;
          modelFallbackUsed = true;
          console.log(`[sb-run] requestId=${requestId} model=${modelId} unavailable, falling back to ${FALLBACK_GEMINI}`);
        }
      }

      let result: RunResult;

      if (isOpenAI) {
        // Variant A: OpenAI - polished, high scores, no review needed
        const baseFlags: string[] = [];
        if (modelFallbackUsed) baseFlags.push("model_fallback_used");
        
        result = {
          run_id: crypto.randomUUID(),
          model_id: actualModelId,
          final_story: {
            title: `User Authentication Flow (${variant_id})`,
            description:
              `As a registered user, I want to securely log in using my email and password so that I can access my personalized dashboard. Model note: ${variant_id}`,
            acceptance_criteria: [
              "User can enter email and password on login form",
              "System validates credentials against stored hash",
              "Successful login redirects to dashboard within 2 seconds",
              "Failed login displays specific error message",
              "Session token expires after 24 hours of inactivity",
            ],
          },
          dor: { passed: true, iterations: 1, fail_reasons: [] },
          eval: {
            overall: 4.6,
            needs_review: false,
            dimensions: {
              clarity: 5,
              testability: 5,
              domain_correctness: 4,
              completeness: 5,
              scope: 4,
            },
            flags: baseFlags,
          },
        };
      } else if (isGemini) {
        // Variant B: Gemini - good but needs review, some flags
        const baseFlags: string[] = ["ambiguous_scope", "missing_edge_cases"];
        if (modelFallbackUsed) baseFlags.push("model_fallback_used");
        
        result = {
          run_id: crypto.randomUUID(),
          model_id: actualModelId,
          final_story: {
            title: `Secure Login Experience (${variant_id})`,
            description:
              `As a user, I want to authenticate with my credentials so that my account remains protected and I can access features. Model note: ${variant_id}`,
            acceptance_criteria: [
              "Login form accepts email and password inputs",
              "Invalid credentials show error feedback",
              "Successful authentication grants access to protected routes",
            ],
          },
          dor: { passed: true, iterations: 2, fail_reasons: [] },
          eval: {
            overall: 3.8,
            needs_review: true,
            dimensions: {
              clarity: 4,
              testability: 3,
              domain_correctness: 4,
              completeness: 3,
              scope: 5,
            },
            flags: baseFlags,
          },
        };
      } else {
        // Fallback for unknown models
        const baseFlags: string[] = ["needs_refinement"];
        if (modelFallbackUsed) baseFlags.push("model_fallback_used");
        
        result = {
          run_id: crypto.randomUUID(),
          model_id: actualModelId,
          final_story: {
            title: `Generic User Story (${variant_id})`,
            description:
              `As a user, I want this feature implemented so that I can accomplish my goal. Model note: ${variant_id}`,
            acceptance_criteria: [
              "Feature works as expected",
              "No errors occur during usage",
            ],
          },
          dor: { passed: true, iterations: 1, fail_reasons: [] },
          eval: {
            overall: 3.5,
            needs_review: true,
            dimensions: {
              clarity: 3,
              testability: 3,
              domain_correctness: 4,
              completeness: 3,
              scope: 4,
            },
            flags: baseFlags,
          },
        };
      }

      // Log per-run details
      console.log(`[sb-run] requestId=${requestId} model=${actualModelId} variant=${variant_id} overall=${result.eval.overall} fallback=${modelFallbackUsed}`);

      return result;
    });

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
