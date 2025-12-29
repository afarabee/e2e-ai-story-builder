// Preset type for story generation scenarios
export interface Preset {
  id: string;
  name: string;
  description?: string;
  rawInput: string;
  customPrompt?: string;
  mode?: 'single' | 'compare';
  models?: string[];
  files?: string[];
}

// Seed presets for login/authentication eval scenarios
export const PRESETS: Preset[] = [
  {
    id: 'high-quality',
    name: 'High Quality – Well-Structured Product Requirements',
    description: 'Clear scope, actors, constraints, and acceptance expectations. Should produce high eval scores and minimal flags.',
    rawInput: `We are building a web-based customer portal for registered users.

Primary goal:
Allow users to securely authenticate and access a personalized dashboard.

Context:
- Users already have accounts created by an admin
- Authentication is email + password
- The system must follow basic security best practices

Functional requirements:
- User can log in using email and password
- Credentials are validated against securely stored hashes
- Successful login redirects the user to their dashboard
- Invalid credentials display a clear, user-friendly error message
- Session expires automatically after a period of inactivity

Non-functional requirements:
- Login should complete within 2 seconds under normal conditions
- Errors must not expose sensitive information

Out of scope:
- Password reset
- Multi-factor authentication

Target users:
- Internal and external customers with existing accounts`,
    customPrompt: '',
    mode: 'single',
    models: ['openai:gpt-5-nano'],
  },
  {
    id: 'medium-quality',
    name: 'Medium Quality – Basic Requirements, Missing Detail',
    description: 'Adequate but underspecified input. Should pass generation but surface eval gaps.',
    rawInput: `Users need to be able to log into the system and see their dashboard.

They should use an email and password to sign in.
If something goes wrong, the system should show an error.
Once logged in, they should be able to access protected areas.

Make sure the login works securely and doesn't take too long.`,
    customPrompt: '',
    mode: 'single',
    models: ['openai:gpt-5-nano'],
  },
  {
    id: 'low-quality',
    name: 'Low Quality – Vague and Ambiguous',
    description: 'Minimal context. Should generate a generic story with lower eval scores and review flags.',
    rawInput: `Build a login feature for users.

It should work well and be secure.`,
    customPrompt: '',
    mode: 'single',
    models: ['openai:gpt-5-nano'],
  },
  {
    id: 'medium-strong-prompt',
    name: 'Medium Input + Strong Prompt – Structured Output Enforcement',
    description: 'Demonstrates how a strong custom prompt improves outcomes even with mediocre input.',
    rawInput: `Users need to log in to the app using their credentials.

They should see an error if login fails and access the app if it succeeds.`,
    customPrompt: `Write the user story in clear agile format.

Requirements:
- Use "As a / I want / So that" format
- Generate 5–7 acceptance criteria
- Include at least:
  - one negative scenario
  - one performance-related criterion
- Avoid vague language like "should work" or "properly"
- Make acceptance criteria objectively testable`,
    mode: 'single',
    models: ['openai:gpt-5-nano'],
  },
  {
    id: 'compare-nano-flash',
    name: 'Compare – Nano vs Flash-Lite',
    description: 'Side-by-side comparison using identical input to demonstrate model differences and eval contrast.',
    rawInput: `Users must be able to log in using email and password to access protected content.

Invalid login attempts should show an error.
Sessions should not stay active forever.`,
    customPrompt: '',
    mode: 'compare',
    models: ['openai:gpt-5-nano', 'google:gemini-2.5-flash-lite'],
  },
];
