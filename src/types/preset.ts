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
  // === HIGH QUALITY PRESETS ===
  {
    id: 'high-quality',
    name: 'High - Customer Login',
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
    id: 'high-quality-refund',
    name: 'High - Refund Request',
    description: 'Comprehensive e-commerce refund request feature with clear eligibility rules, functional requirements, and scope boundaries.',
    rawInput: `We need a self-service refund request feature in our e-commerce portal.

Goal:
Allow a logged-in customer to request a refund for an order item within the allowed policy window.

Context:
- Orders may contain multiple items
- Refund eligibility depends on:
  - item status (delivered)
  - time since delivery (<= 30 days)
  - item category exclusions (final sale items are not eligible)

Functional requirements:
- Customer can open an order and choose an item to request a refund
- System checks eligibility rules and shows eligibility outcome before submission
- Customer must provide a reason (dropdown) and optional comments
- On submit, system creates a refund request record and shows confirmation with a tracking ID
- Customer can view refund request status (Submitted, Under Review, Approved, Denied, Completed)

Non-functional requirements:
- Confirmation should be shown immediately after submission
- Do not expose internal fraud/risk logic to the user

Out of scope:
- Automated approval decisions
- Chargebacks`,
    customPrompt: '',
    mode: 'single',
    models: ['openai:gpt-5-nano'],
  },

  // === MEDIUM QUALITY PRESETS ===
  {
    id: 'medium-quality',
    name: 'Medium - Customer Login',
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
    id: 'medium-quality-address',
    name: 'Medium - Shipping Address',
    description: 'Basic address management requirements with some missing details around validation and edge cases.',
    rawInput: `Customers should be able to update their shipping address.

They should be able to add a new address and pick a default.
Make sure it validates the address and updates future shipments.`,
    customPrompt: '',
    mode: 'single',
    models: ['openai:gpt-5-nano'],
  },
  {
    id: 'medium-strong-prompt',
    name: 'Medium + Prompt - Customer Login',
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

  // === LOW QUALITY PRESETS ===
  {
    id: 'low-quality',
    name: 'Low - Customer Login',
    description: 'Minimal context. Should generate a generic story with lower eval scores and review flags.',
    rawInput: `Build a login feature for users.

It should work well and be secure.`,
    customPrompt: '',
    mode: 'single',
    models: ['openai:gpt-5-nano'],
  },
  {
    id: 'low-quality-notifications',
    name: 'Low - Notifications',
    description: 'Extremely vague notification request with no context, types, or delivery mechanisms specified.',
    rawInput: `Add notifications so users know what's going on.

It should be good and not annoying.`,
    customPrompt: '',
    mode: 'single',
    models: ['openai:gpt-5-nano'],
  },

  // === COMPARE PRESETS ===
  {
    id: 'compare_login_high',
    name: 'Compare - Login (High)',
    description: 'Side-by-side comparison using high-quality login input to demonstrate model differences.',
    rawInput: `Implement a secure customer login experience for a web application.

Users must authenticate using email and password.

The system should validate credentials, handle errors clearly, and protect user accounts from misuse.

Include clear success and failure states.`,
    customPrompt: '',
    mode: 'compare',
    models: ['openai:gpt-5-nano', 'google:gemini-2.5-flash-lite'],
  },
  {
    id: 'compare_login_medium',
    name: 'Compare - Login (Medium)',
    description: 'Side-by-side comparison using medium-quality login input to demonstrate model differences.',
    rawInput: `We need login functionality for users.

They should be able to sign in and get access to their account.

Make sure errors are handled.`,
    customPrompt: '',
    mode: 'compare',
    models: ['openai:gpt-5-nano', 'google:gemini-2.5-flash-lite'],
  },
  {
    id: 'compare_login_low',
    name: 'Compare - Login (Low)',
    description: 'Side-by-side comparison using low-quality login input to demonstrate model differences and eval contrast.',
    rawInput: `Users need to log in.`,
    customPrompt: '',
    mode: 'compare',
    models: ['openai:gpt-5-nano', 'google:gemini-2.5-flash-lite'],
  },
];
