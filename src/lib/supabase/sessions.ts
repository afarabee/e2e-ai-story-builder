import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, Json } from "@/integrations/supabase/types";

type Session = Tables<"sb_sessions">;
type Story = Tables<"sb_stories">;
type Action = Tables<"sb_actions">;

export async function createSession(
  title?: string,
  contextDefaults?: Record<string, unknown>
): Promise<{ session: Session }> {
  const insertData: TablesInsert<"sb_sessions"> = {
    title: title ?? null,
    context_defaults: (contextDefaults as Json) ?? null,
  };

  const { data, error } = await supabase
    .from("sb_sessions")
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return { session: data };
}

export async function getSession(sessionId: string): Promise<{
  session: Session;
  currentStory: Story | null;
  lastAction: Action | null;
}> {
  const { data: session, error: sessionError } = await supabase
    .from("sb_sessions")
    .select()
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) throw sessionError;
  if (!session) throw new Error("Session not found");

  let currentStory: Story | null = null;
  if (session.current_story_id) {
    const { data, error } = await supabase
      .from("sb_stories")
      .select()
      .eq("id", session.current_story_id)
      .maybeSingle();
    if (!error) currentStory = data;
  }

  const { data: lastAction } = await supabase
    .from("sb_actions")
    .select()
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { session, currentStory, lastAction };
}

export async function getSessionHistory(
  sessionId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ actions: Action[] }> {
  const { data, error } = await supabase
    .from("sb_actions")
    .select()
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { actions: data ?? [] };
}
