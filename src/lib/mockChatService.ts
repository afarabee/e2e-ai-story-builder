export interface ChatContext {
  type: 'story' | 'criteria' | 'testing' | 'dev-notes' | 'points';
  suggestion?: any;
  field?: string;
}

interface MockChatResponse {
  text: string;
  context: ChatContext;
}

export function generateMockChatResponse(
  userInput: string,
  currentStory: any
): MockChatResponse {
  // Provide safe defaults if currentStory is undefined
  if (!currentStory) {
    currentStory = { 
      title: 'User Story', 
      description: 'As a user, I want functionality so that I achieve value.',
      acceptanceCriteria: []
    };
  }
  
  const input = userInput.toLowerCase();
  
  // Detect action and intent
  if (input.includes('add') && (input.includes('acceptance') || input.includes('criterion') || input.includes('ac'))) {
    return {
      text: "I'll add a new acceptance criterion focusing on data validation and error handling.",
      context: {
        type: 'criteria',
        suggestion: 'System validates all user inputs and displays clear error messages for invalid data',
        field: 'acceptanceCriteria'
      }
    };
  }
  
  if (input.includes('remove') && (input.includes('acceptance') || input.includes('criterion') || input.includes('ac'))) {
    return {
      text: "I recommend removing the first acceptance criterion as it seems redundant with the others.",
      context: {
        type: 'criteria',
        suggestion: { action: 'remove', index: 0 },
        field: 'acceptanceCriteria'
      }
    };
  }
  
  if (input.includes('minus') && (input.includes('criterion') || input.includes('ac'))) {
    return {
      text: "I'll remove the last acceptance criterion to simplify the scope.",
      context: {
        type: 'criteria',
        suggestion: { action: 'remove', index: -1 },
        field: 'acceptanceCriteria'
      }
    };
  }
  
  if ((input.includes('increase') || input.includes('bump') || input.includes('raise')) && input.includes('point')) {
    const points = parseInt(input.match(/\d+/)?.[0] || '8');
    return {
      text: `Given the complexity, I recommend increasing the story points to ${points}.`,
      context: {
        type: 'points',
        suggestion: points,
        field: 'storyPoints'
      }
    };
  }
  
  if ((input.includes('decrease') || input.includes('reduce') || input.includes('lower')) && input.includes('point')) {
    const points = parseInt(input.match(/\d+/)?.[0] || '3');
    return {
      text: `This seems simpler than initially thought. Let's reduce to ${points} story points.`,
      context: {
        type: 'points',
        suggestion: points,
        field: 'storyPoints'
      }
    };
  }
  
  if (input.includes('simplif') && input.includes('description')) {
    return {
      text: "I'll make the description more concise while keeping the key points.",
      context: {
        type: 'story',
        suggestion: (currentStory?.description || 'The user story').split('.')[0] + '. This enables better user experience and efficiency.',
        field: 'description'
      }
    };
  }
  
  if (input.includes('detail') && input.includes('description')) {
    return {
      text: "I'll add more technical details to the description.",
      context: {
        type: 'story',
        suggestion: (currentStory?.description || 'This feature') + ' This includes comprehensive input validation, secure data handling, error recovery mechanisms, and audit logging for compliance.',
        field: 'description'
      }
    };
  }
  
  if (input.includes('change') && input.includes('title')) {
    return {
      text: "Here's a more descriptive title that better captures the user value.",
      context: {
        type: 'story',
        suggestion: 'Enhanced ' + (currentStory?.title || 'User Story') + ' with Advanced Features',
        field: 'title'
      }
    };
  }
  
  if (input.includes('edge case')) {
    return {
      text: "I'll add this edge case as an acceptance criterion.",
      context: {
        type: 'testing',
        suggestion: 'Concurrent access from multiple sessions with conflicting data updates',
        field: 'acceptanceCriteria'
      }
    };
  }
  
  if (input.includes('security') || input.includes('secure')) {
    return {
      text: "I'll add security-focused acceptance criteria.",
      context: {
        type: 'criteria',
        suggestion: 'All data transmissions use HTTPS encryption and sensitive data is never logged',
        field: 'acceptanceCriteria'
      }
    };
  }
  
  if (input.includes('performance') || input.includes('fast') || input.includes('speed')) {
    return {
      text: "Adding performance requirements to ensure optimal user experience.",
      context: {
        type: 'criteria',
        suggestion: 'Page load time must not exceed 2 seconds on standard broadband connection',
        field: 'acceptanceCriteria'
      }
    };
  }
  
  if (input.includes('accessibility') || input.includes('a11y')) {
    return {
      text: "Accessibility is crucial. Let me add WCAG compliance criteria.",
      context: {
        type: 'criteria',
        suggestion: 'Interface meets WCAG 2.1 Level AA standards with keyboard navigation and screen reader support',
        field: 'acceptanceCriteria'
      }
    };
  }
  
  if (input.includes('mobile') || input.includes('responsive')) {
    return {
      text: "Adding mobile responsiveness requirement.",
      context: {
        type: 'criteria',
        suggestion: 'Interface is fully responsive and works seamlessly on mobile devices (iOS and Android)',
        field: 'acceptanceCriteria'
      }
    };
  }
  
  if (input.includes('error') || input.includes('validation')) {
    return {
      text: "Let's ensure robust error handling is covered.",
      context: {
        type: 'criteria',
        suggestion: 'All error states provide clear, actionable feedback to users with recovery options',
        field: 'acceptanceCriteria'
      }
    };
  }
  
  if (input.includes('technical') || input.includes('implementation')) {
    return {
      text: "Here are some technical implementation notes to consider:",
      context: {
        type: 'dev-notes',
        suggestion: `// API Integration\nconst fetchData = async () => {\n  try {\n    const response = await fetch('/api/endpoint', {\n      method: 'GET',\n      headers: { 'Authorization': 'Bearer token' }\n    });\n    const data = await response.json();\n    return data;\n  } catch (error) {\n    console.error('API Error:', error);\n    throw error;\n  }\n};`,
        field: 'codeSnippets'
      }
    };
  }
  
  if (input.includes('test') && (input.includes('data') || input.includes('case'))) {
    return {
      text: "I'll add this testing scenario to your acceptance criteria.",
      context: {
        type: 'testing',
        suggestion: 'User attempts to perform action without required permissions or authentication',
        field: 'acceptanceCriteria'
      }
    };
  }
  
  // General guidance responses (no Apply button - no actionable suggestion)
  const generalGuidanceResponses: MockChatResponse[] = [
    {
      text: "Good question! For this type of story, consider breaking it down into smaller, testable pieces. Each acceptance criterion should be independently verifiable.",
      context: { type: 'story' }
    },
    {
      text: "That's a solid approach. INVEST criteria (Independent, Negotiable, Valuable, Estimable, Small, Testable) are helpful guidelines when crafting user stories.",
      context: { type: 'story' }
    },
    {
      text: "Based on your story, the scope looks appropriate. Make sure each acceptance criterion has clear pass/fail conditions that QA can verify.",
      context: { type: 'story' }
    },
    {
      text: "Consider the user's perspective here. What would success look like from their point of view? This helps shape better acceptance criteria.",
      context: { type: 'story' }
    },
    {
      text: "The story points seem reasonable. Remember that complexity, uncertainty, and effort all factor into estimation.",
      context: { type: 'points' }
    }
  ];
  
  // Random suggestion generator for any input that doesn't match keywords
  const randomSuggestions: MockChatResponse[] = [
    {
      text: "I'll add a validation-focused acceptance criterion.",
      context: {
        type: 'criteria',
        suggestion: 'System validates all required fields with real-time feedback and prevents submission of invalid data',
        field: 'acceptanceCriteria'
      }
    },
    {
      text: "Let me suggest a security-focused acceptance criterion.",
      context: {
        type: 'criteria',
        suggestion: 'All sensitive data is encrypted in transit and at rest, with secure session management',
        field: 'acceptanceCriteria'
      }
    },
    {
      text: "I recommend adjusting story points based on complexity.",
      context: {
        type: 'points',
        suggestion: [3, 5, 8][Math.floor(Math.random() * 3)], // Random Fibonacci: 3, 5, or 8
        field: 'storyPoints'
      }
    },
    {
      text: "I'll add this edge case to your acceptance criteria.",
      context: {
        type: 'testing',
        suggestion: 'User attempts operation with expired session or invalid authentication token',
        field: 'acceptanceCriteria'
      }
    },
    {
      text: "I'll add a performance requirement.",
      context: {
        type: 'criteria',
        suggestion: 'All user actions receive feedback within 200ms with loading indicators for operations exceeding 1 second',
        field: 'acceptanceCriteria'
      }
    },
    {
      text: "Let's ensure accessibility compliance.",
      context: {
        type: 'criteria',
        suggestion: 'Interface supports keyboard navigation, screen readers, and meets WCAG 2.1 AA standards',
        field: 'acceptanceCriteria'
      }
    },
    {
      text: "I'll add mobile responsiveness criteria.",
      context: {
        type: 'criteria',
        suggestion: 'Interface adapts seamlessly to mobile devices with touch-friendly controls and responsive layout',
        field: 'acceptanceCriteria'
      }
    },
    {
      text: "I'll add this boundary testing scenario to your criteria.",
      context: {
        type: 'testing',
        suggestion: 'System handles maximum data limits, empty states, and concurrent user actions gracefully',
        field: 'acceptanceCriteria'
      }
    },
    {
      text: "I recommend increasing complexity for this feature.",
      context: {
        type: 'points',
        suggestion: 8,
        field: 'storyPoints'
      }
    },
    {
      text: "Let's add error handling requirements.",
      context: {
        type: 'criteria',
        suggestion: 'All errors display user-friendly messages with recovery options and are logged for debugging',
        field: 'acceptanceCriteria'
      }
    },
    {
      text: "I'll add this data integrity check to your acceptance criteria.",
      context: {
        type: 'testing',
        suggestion: 'Verify data consistency during network interruptions and partial failures',
        field: 'acceptanceCriteria'
      }
    },
    {
      text: "I'll add API integration details.",
      context: {
        type: 'dev-notes',
        suggestion: `// API Error Handling\ntry {\n  const response = await api.call();\n  handleSuccess(response);\n} catch (error) {\n  logError(error);\n  showUserFeedback();\n}`,
        field: 'codeSnippets'
      }
    },
    {
      text: "Let's ensure data privacy compliance.",
      context: {
        type: 'criteria',
        suggestion: 'System complies with GDPR/CCPA requirements including data export, deletion, and consent management',
        field: 'acceptanceCriteria'
      }
    },
    {
      text: "This seems like a medium complexity task.",
      context: {
        type: 'points',
        suggestion: 5,
        field: 'storyPoints'
      }
    },
    {
      text: "I'll add this network resilience criterion.",
      context: {
        type: 'testing',
        suggestion: 'Test behavior under slow network conditions, timeouts, and offline scenarios',
        field: 'acceptanceCriteria'
      }
    },
    {
      text: "Let's add cross-browser compatibility.",
      context: {
        type: 'criteria',
        suggestion: 'Interface functions correctly in Chrome, Firefox, Safari, and Edge (last 2 versions)',
        field: 'acceptanceCriteria'
      }
    },
    {
      text: "Here's a state management consideration.",
      context: {
        type: 'dev-notes',
        suggestion: `// State Management\nconst [state, setState] = useState(initialState);\n\nuseEffect(() => {\n  // Sync with backend\n  fetchData().then(setState);\n}, [dependencies]);`,
        field: 'codeSnippets'
      }
    },
    {
      text: "I recommend simplifying this to reduce scope.",
      context: {
        type: 'points',
        suggestion: 3,
        field: 'storyPoints'
      }
    },
    {
      text: "I'll add this i18n testing criterion.",
      context: {
        type: 'testing',
        suggestion: 'Verify handling of special characters, right-to-left languages, and varying date/number formats',
        field: 'acceptanceCriteria'
      }
    },
    {
      text: "I'll add monitoring and observability.",
      context: {
        type: 'criteria',
        suggestion: 'System logs critical events, tracks performance metrics, and provides debugging information',
        field: 'acceptanceCriteria'
      }
    },
    {
      text: "Let me suggest a clearer title that better captures the user value.",
      context: {
        type: 'story',
        suggestion: 'Enhanced ' + (currentStory?.title || 'User Story') + ' with Improved UX',
        field: 'title'
      }
    },
    {
      text: "Here's a more action-oriented title.",
      context: {
        type: 'story',
        suggestion: (currentStory?.title || 'Feature').replace(/^.*?(?=User|Feature|Story|System)/i, 'Streamlined '),
        field: 'title'
      }
    },
    {
      text: "I'll enhance the description with more context about user value.",
      context: {
        type: 'story',
        suggestion: (currentStory?.description || 'As a user') + ' Additionally, this provides improved efficiency and reduces friction in the workflow.',
        field: 'description'
      }
    },
    {
      text: "Let me refine the description to be more concise.",
      context: {
        type: 'story',
        suggestion: 'As a user, I want to quickly accomplish my goal with minimal steps, so that I can focus on higher-value tasks.',
        field: 'description'
      }
    }
  ];

  // 20% chance to return general guidance (no Apply button) instead of actionable suggestion
  if (Math.random() < 0.2) {
    return generalGuidanceResponses[Math.floor(Math.random() * generalGuidanceResponses.length)];
  }
  
  // Return random suggestion for any unmatched input (including gibberish)
  return randomSuggestions[Math.floor(Math.random() * randomSuggestions.length)];
}
