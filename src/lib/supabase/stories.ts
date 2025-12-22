import { supabase } from "@/integrations/supabase/client";
import type { Tables, Json } from "@/integrations/supabase/types";

type Story = Tables<"sb_stories">;
type StorySource = "llm" | "quick_fix" | "apply_suggestion" | "manual";

export async function createStorySnapshot(
  sessionId: string,
  story: Json,
  source: StorySource
): Promise<{ storyRow: Story }> {
  const { data, error } = await supabase
    .from("sb_stories")
    .insert({
      session_id: sessionId,
      story,
      source,
    })
    .select()
    .single();

  if (error) throw error;
  return { storyRow: data };
}

export async function getStory(storyId: string): Promise<{ storyRow: Story }> {
  const { data, error } = await supabase
    .from("sb_stories")
    .select()
    .eq("id", storyId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Story not found");
  return { storyRow: data };
}
