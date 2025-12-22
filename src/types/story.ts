export interface UserStory {
  title: string;
  description: string;
  acceptanceCriteria: string[];
}

export interface ProjectSettings {
  projectName: string;
  projectDescription: string;
  technicalContext: string;
  designGuidelines: string;
  additionalContext: string;
}

export interface StoryVersion {
  id: string;
  timestamp: number;
  story: UserStory;
  changeDescription?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface FileMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadDate: number;
  description?: string;
}

export type RefinementField = 'title' | 'description' | 'acceptanceCriteria';

export interface GenerateStoryRequest {
  role: string;
  goal: string;
  benefit: string;
  projectSettings: ProjectSettings;
}

export interface GenerateStoryResponse {
  story_title: string;
  story_description: string;
  acceptance_criteria: string[];
}

export interface RefineStoryRequest {
  user_input: string;
  current_story: UserStory;
  field: RefinementField;
  projectSettings: ProjectSettings;
}

export interface RefineStoryResponse {
  suggestion: string;
  field: RefinementField;
}
