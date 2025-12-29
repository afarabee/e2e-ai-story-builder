-- Create sb_prompt_versions table
CREATE TABLE public.sb_prompt_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  template text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sb_prompt_versions ENABLE ROW LEVEL SECURITY;

-- Allow all access (single-user app, no auth)
CREATE POLICY "Allow all access to sb_prompt_versions"
  ON public.sb_prompt_versions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Seed with story_gen_v1 using exact user-provided template
INSERT INTO public.sb_prompt_versions (name, template, description, status)
VALUES (
  'story_gen_v1',
  'You are an expert AI product partner helping Agile Product Owners generate high-quality user stories and testable acceptance criteria for export to Azure DevOps.

Context (knowledge base):

- Project: {{project_name}}

- Description: {{project_description}}

- Persona: {{persona}}

- Tone: {{tone}}

- Format: {{format}}

Additional inputs:

- Raw input: {{raw_input}}

- Custom prompt: {{custom_prompt}}

- File content: {{file_content}}

- Project context: {{project_context}}

Task:

Produce an INVEST-quality user story aligned to the context.

The user story should include a title, description, and testable acceptance criteria in bullet points.

Do NOT include a ''definition of done'' section.

Do NOT use Gherkin (Given/When/Then) format for the acceptance criteria.

Return JSON if possible, but if not, just return text.',
  'Initial story generation prompt with standardized {{token}} placeholders for project context, persona, tone, format, and inputs.',
  'active'
);