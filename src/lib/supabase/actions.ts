import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate, Json } from "@/integrations/supabase/types";

type Action = Tables<"sb_actions">;
type ActionType = "chat" | "generate" | "refine_story" | "refine_field" | "apply_quick_fixes" | "apply_suggestion";
type OutputFormat = "json" | "text" | "none";

export interface ActionPayload {
  action_type: ActionType;
  prompt_version: string;
  model?: string;
  temperature?: number;
  inputs?: Json;
  output_raw?: string;
  output_format?: OutputFormat;
  before_story_id?: string;
  after_story_id?: string;
  error?: string;
}

export async function createAction(
  sessionId: string,
  payload: ActionPayload
): Promise<{ actionRow: Action }> {
  const { data, error } = await supabase
    .from("sb_actions")
    .insert({
      session_id: sessionId,
      ...payload,
    })
    .select()
    .single();

  if (error) throw error;
  return { actionRow: data };
}

export async function updateAction(
  actionId: string,
  patch: TablesUpdate<"sb_actions">
): Promise<{ actionRow: Action }> {
  const { data, error } = await supabase
    .from("sb_actions")
    .update(patch)
    .eq("id", actionId)
    .select()
    .single();

  if (error) throw error;
  return { actionRow: data };
}
