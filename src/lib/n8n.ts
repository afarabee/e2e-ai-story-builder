import type { 
  GenerateStoryRequest, 
  GenerateStoryResponse, 
  RefineStoryRequest, 
  RefineStoryResponse 
} from '@/types/story';

// Configure these with your n8n webhook URLs
const N8N_STORY_GENERATION_URL = import.meta.env.VITE_N8N_STORY_GENERATION_URL || '';
const N8N_STORY_REFINEMENT_URL = import.meta.env.VITE_N8N_STORY_REFINEMENT_URL || '';

/**
 * Generate a new user story using n8n workflow
 */
export async function generateStory(
  data: GenerateStoryRequest
): Promise<GenerateStoryResponse> {
  if (!N8N_STORY_GENERATION_URL) {
    throw new Error('n8n Story Generation webhook URL not configured. Please set VITE_N8N_STORY_GENERATION_URL environment variable.');
  }

  const response = await fetch(N8N_STORY_GENERATION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`n8n workflow failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Refine a user story field using n8n workflow
 */
export async function refineStory(
  data: RefineStoryRequest
): Promise<RefineStoryResponse> {
  if (!N8N_STORY_REFINEMENT_URL) {
    throw new Error('n8n Story Refinement webhook URL not configured. Please set VITE_N8N_STORY_REFINEMENT_URL environment variable.');
  }

  const response = await fetch(N8N_STORY_REFINEMENT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`n8n workflow failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}
