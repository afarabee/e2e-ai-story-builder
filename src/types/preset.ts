// Preset type for story generation scenarios
export interface Preset {
  id: string;
  name: string;
  rawInput: string;
  customPrompt?: string;
  mode?: 'single' | 'compare';
  models?: string[];
  files?: string[]; // Display only for now
}

// Seed presets
export const PRESETS: Preset[] = [
  {
    id: 'high-complexity',
    name: 'High Complexity',
    rawInput: 'As a power user, I need to manage multiple dashboards with real-time data streaming, custom widget layouts, role-based access controls, and audit logging for compliance. The system must support 10k concurrent users with sub-second latency.',
    customPrompt: 'Focus on scalability, security, and performance requirements. Include detailed acceptance criteria for each feature.',
  },
  {
    id: 'medium-complexity',
    name: 'Medium Complexity',
    rawInput: 'As a user, I want to create and manage a personal task list with categories, due dates, and priority levels so I can organize my daily work effectively.',
    customPrompt: '',
  },
  {
    id: 'low-complexity',
    name: 'Low Complexity',
    rawInput: 'As a visitor, I want to see a contact form on the landing page so I can submit inquiries.',
  },
  {
    id: 'medium-strong-prompt',
    name: 'Medium + Strong Custom Prompt',
    rawInput: 'As a team lead, I want to assign tasks to team members and track their progress through a kanban board.',
    customPrompt: 'Write acceptance criteria that are extremely specific and testable. Each criterion should be verifiable in under 5 minutes. Include edge cases for offline mode and conflict resolution when multiple users edit simultaneously.',
  },
  {
    id: 'compare-nano-flash',
    name: 'Compare Nano vs Flash-Lite',
    rawInput: 'As a customer, I want to receive email notifications when my order status changes so I stay informed about my delivery.',
    mode: 'compare',
    models: ['openai:gpt-5-nano', 'google:gemini-2.5-flash-lite'],
  },
];
