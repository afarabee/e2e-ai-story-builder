export interface PromptVersion {
  id: string;
  name: string;
  template: string;
  description: string | null;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
}
