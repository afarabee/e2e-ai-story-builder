import { supabase } from "@/integrations/supabase/client";
import { PromptVersion } from "@/types/promptVersion";

export async function getPromptVersions(): Promise<PromptVersion[]> {
  const { data, error } = await supabase
    .from('sb_prompt_versions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching prompt versions:', error);
    throw error;
  }

  return (data || []) as PromptVersion[];
}

export async function getPromptVersionById(id: string): Promise<PromptVersion | null> {
  const { data, error } = await supabase
    .from('sb_prompt_versions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching prompt version:', error);
    throw error;
  }

  return data as PromptVersion;
}

export async function createPromptVersion(data: {
  name: string;
  template: string;
  description?: string;
  status?: 'draft' | 'active' | 'archived';
}): Promise<PromptVersion> {
  const { data: result, error } = await supabase
    .from('sb_prompt_versions')
    .insert({
      name: data.name,
      template: data.template,
      description: data.description || null,
      status: data.status || 'draft',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating prompt version:', error);
    throw error;
  }

  return result as PromptVersion;
}
