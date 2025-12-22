export interface MockStoryTemplate {
  keywords: string[];
  title: string;
  description: string;
  acceptanceCriteria: string[];
  storyPoints: number;
  testData: {
    userInputs: string[];
    edgeCases: string[];
    apiResponses: any[];
    codeSnippets: string[];
  };
  devNotes: string;
}

const storyTemplates: MockStoryTemplate[] = [
  {
    keywords: ['login', 'auth', 'authentication', 'sign in', 'user'],
    title: 'User Authentication System',
    description: 'As a user, I want to securely log in to the application so that I can access my personalized dashboard and data.',
    acceptanceCriteria: [
      'User can enter email and password on the login page',
      'System validates credentials against the database',
      'Successful login redirects to the dashboard',
      'Failed login displays an error message',
      'Password must meet security requirements (8+ characters, uppercase, lowercase, number)',
      'Account locks after 5 failed attempts',
      'User receives email notification on successful login from new device',
      'Session expires after 24 hours of inactivity'
    ],
    storyPoints: 8,
    testData: {
      userInputs: [
        'Valid credentials: user@example.com / SecurePass123',
        'Invalid email format: notanemail / password',
        'Correct email, wrong password: user@example.com / WrongPass',
        'Empty fields submission',
        'SQL injection attempt in email field'
      ],
      edgeCases: [
        'Account locked after multiple failed attempts',
        'Concurrent login attempts from different devices',
        'Session timeout during active use',
        'Password with special characters and emojis',
        'Login attempt with deactivated account'
      ],
      apiResponses: [
        { endpoint: '/api/auth/login', method: 'POST', status: 200, body: { token: 'eyJhbG...', user: { id: 1, email: 'user@example.com' } } },
        { endpoint: '/api/auth/login', method: 'POST', status: 401, body: { error: 'Invalid credentials' } },
        { endpoint: '/api/auth/login', method: 'POST', status: 429, body: { error: 'Account locked. Try again in 15 minutes.' } }
      ],
      codeSnippets: [
        `const handleLogin = async (email: string, password: string) => {\n  const response = await fetch('/api/auth/login', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify({ email, password })\n  });\n  if (response.ok) {\n    const { token } = await response.json();\n    localStorage.setItem('authToken', token);\n    navigate('/dashboard');\n  }\n};`,
        `const validatePassword = (password: string): boolean => {\n  const minLength = 8;\n  const hasUpperCase = /[A-Z]/.test(password);\n  const hasLowerCase = /[a-z]/.test(password);\n  const hasNumber = /[0-9]/.test(password);\n  return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumber;\n};`
      ]
    },
    devNotes: 'Technical considerations: Implement rate limiting, use bcrypt for password hashing, store sessions in Redis for scalability, add CSRF protection, implement 2FA support for future enhancement.'
  },
  {
    keywords: ['payment', 'checkout', 'stripe', 'purchase', 'billing'],
    title: 'Secure Payment Processing',
    description: 'As a customer, I want to complete purchases securely using my credit card so that I can buy products with confidence.',
    acceptanceCriteria: [
      'User can enter credit card information in a secure form',
      'System validates card number, expiry date, and CVV',
      'Payment is processed through Stripe API',
      'User receives immediate confirmation of successful payment',
      'Failed payments show clear error messages',
      'Payment receipts are emailed to the customer',
      'All transactions are logged for audit purposes'
    ],
    storyPoints: 13,
    testData: {
      userInputs: [
        'Valid card: 4242 4242 4242 4242, Exp: 12/25, CVV: 123',
        'Declined card: 4000 0000 0000 0002',
        'Insufficient funds card: 4000 0000 0000 9995',
        'Card number with spaces and dashes',
        'Expired card: 4242 4242 4242 4242, Exp: 01/20'
      ],
      edgeCases: [
        'Network timeout during payment processing',
        'Duplicate payment submission (double-click)',
        'Payment with international card requiring 3D Secure',
        'Refund processing after successful payment',
        'Payment with promotional code and discount'
      ],
      apiResponses: [
        { endpoint: '/api/payments/charge', method: 'POST', status: 200, body: { chargeId: 'ch_123', amount: 9999, status: 'succeeded' } },
        { endpoint: '/api/payments/charge', method: 'POST', status: 402, body: { error: 'Your card was declined' } },
        { endpoint: '/api/payments/charge', method: 'POST', status: 500, body: { error: 'Payment gateway timeout' } }
      ],
      codeSnippets: [
        `const processPayment = async (cardDetails) => {\n  const stripe = await loadStripe(process.env.STRIPE_PUBLIC_KEY);\n  const { error, paymentMethod } = await stripe.createPaymentMethod({\n    type: 'card',\n    card: cardDetails\n  });\n  if (error) {\n    throw new Error(error.message);\n  }\n  return paymentMethod;\n};`,
        `const handlePaymentWebhook = async (event) => {\n  switch (event.type) {\n    case 'payment_intent.succeeded':\n      await updateOrderStatus(event.data.object.id, 'paid');\n      await sendReceiptEmail(event.data.object.receipt_email);\n      break;\n    case 'payment_intent.payment_failed':\n      await notifyCustomer(event.data.object.id, 'failed');\n      break;\n  }\n};`
      ]
    },
    devNotes: 'Technical considerations: Use Stripe Elements for PCI compliance, implement idempotency keys to prevent duplicate charges, add webhook handlers for asynchronous payment updates, store payment methods securely for future use.'
  },
  {
    keywords: ['search', 'filter', 'find', 'query', 'results'],
    title: 'Advanced Product Search',
    description: 'As a shopper, I want to search and filter products efficiently so that I can quickly find items I\'m interested in purchasing.',
    acceptanceCriteria: [
      'Search bar is prominently displayed on all pages',
      'Search returns results within 2 seconds',
      'Results can be filtered by category, price range, and rating',
      'Search supports typo tolerance and partial matching',
      'Results are paginated with 20 items per page',
      'User can sort results by relevance, price, or popularity'
    ],
    storyPoints: 5,
    testData: {
      userInputs: [
        'Exact product name: "Wireless Mouse"',
        'Partial match: "wire mou"',
        'Typo: "wirelss mose"',
        'Category filter: Electronics + Price: $10-$50',
        'Empty search query'
      ],
      edgeCases: [
        'Search with special characters: "@#$%"',
        'Very long search query (500+ characters)',
        'Search during high server load',
        'No results found scenario',
        'Filter combination that returns zero results'
      ],
      apiResponses: [
        { endpoint: '/api/search', method: 'GET', status: 200, body: { results: [{ id: 1, name: 'Wireless Mouse', price: 29.99 }], total: 45, page: 1 } },
        { endpoint: '/api/search', method: 'GET', status: 200, body: { results: [], total: 0, page: 1 } }
      ],
      codeSnippets: [
        `const searchProducts = async (query: string, filters: Filters) => {\n  const params = new URLSearchParams({\n    q: query,\n    category: filters.category,\n    minPrice: filters.minPrice.toString(),\n    maxPrice: filters.maxPrice.toString(),\n    page: filters.page.toString()\n  });\n  const response = await fetch(\`/api/search?\${params}\`);\n  return response.json();\n};`
      ]
    },
    devNotes: 'Technical considerations: Implement Elasticsearch for fast full-text search, add caching layer for common queries, use debouncing on search input (300ms), consider implementing autocomplete suggestions.'
  },
  {
    keywords: ['notification', 'alert', 'email', 'push', 'message'],
    title: 'Real-time Notification System',
    description: 'As a user, I want to receive timely notifications about important events so that I stay informed about updates relevant to me.',
    acceptanceCriteria: [
      'User can opt-in to email and push notifications',
      'Notifications are sent within 30 seconds of triggering event',
      'User can customize notification preferences by category',
      'Notifications include clear call-to-action buttons',
      'User can view notification history in the app',
      'Unread notifications are highlighted with a badge count'
    ],
    storyPoints: 8,
    testData: {
      userInputs: [
        'Enable all notification types',
        'Enable only critical alerts',
        'Disable all notifications',
        'Set custom notification schedule (9 AM - 6 PM only)',
        'Mark all notifications as read'
      ],
      edgeCases: [
        'Notification sent when user is offline',
        'Multiple notifications within short time span (rate limiting)',
        'Push notification when browser permissions denied',
        'Email notification with HTML rendering issues',
        'Notification for deleted or archived content'
      ],
      apiResponses: [
        { endpoint: '/api/notifications', method: 'GET', status: 200, body: { notifications: [{ id: 1, type: 'order', message: 'Your order shipped', read: false }], unreadCount: 3 } },
        { endpoint: '/api/notifications/preferences', method: 'PUT', status: 200, body: { success: true } }
      ],
      codeSnippets: [
        `const sendPushNotification = async (userId: string, message: string) => {\n  const subscription = await getUserSubscription(userId);\n  await webpush.sendNotification(subscription, JSON.stringify({\n    title: 'New Update',\n    body: message,\n    icon: '/icon.png'\n  }));\n};`
      ]
    },
    devNotes: 'Technical considerations: Use WebSocket or Server-Sent Events for real-time delivery, implement notification batching to prevent spam, add retry logic for failed deliveries, store notifications in database for history.'
  },
  {
    keywords: ['admin', 'dashboard', 'analytics', 'report', 'metrics'],
    title: 'Admin Analytics Dashboard',
    description: 'As an admin, I want to view comprehensive analytics about user activity and system performance so that I can make data-driven decisions.',
    acceptanceCriteria: [
      'Dashboard displays key metrics: total users, active sessions, revenue',
      'Charts show trends over customizable time periods (day, week, month)',
      'Data refreshes automatically every 5 minutes',
      'Admin can export reports as CSV or PDF',
      'Dashboard loads within 3 seconds',
      'Responsive design works on desktop and tablet'
    ],
    storyPoints: 13,
    testData: {
      userInputs: [
        'View last 7 days of user activity',
        'Export monthly revenue report as CSV',
        'Filter data by user segment (free vs. paid)',
        'Compare current month vs. previous month',
        'View real-time active users count'
      ],
      edgeCases: [
        'Dashboard with zero data (new system)',
        'Very large dataset (10M+ records)',
        'Export with special characters in data',
        'Chart rendering with missing data points',
        'Multiple admins viewing dashboard simultaneously'
      ],
      apiResponses: [
        { endpoint: '/api/admin/analytics', method: 'GET', status: 200, body: { totalUsers: 12453, activeToday: 892, revenue: 45678.90 } },
        { endpoint: '/api/admin/export', method: 'POST', status: 200, body: { downloadUrl: '/exports/analytics-2024-01.csv' } }
      ],
      codeSnippets: [
        `const fetchAnalytics = async (timeRange: string) => {\n  const response = await fetch(\`/api/admin/analytics?range=\${timeRange}\`);\n  const data = await response.json();\n  return {\n    labels: data.dates,\n    datasets: [{\n      label: 'Active Users',\n      data: data.activeUsers\n    }]\n  };\n};`
      ]
    },
    devNotes: 'Technical considerations: Use aggregation queries for performance, implement caching for frequently accessed metrics, add data visualization library (Recharts), consider WebSocket for real-time updates.'
  },
  {
    keywords: ['upload', 'file', 'image', 'document', 'attachment'],
    title: 'File Upload and Management',
    description: 'As a user, I want to upload and manage files securely so that I can share documents and images with my team.',
    acceptanceCriteria: [
      'User can drag-and-drop files or click to browse',
      'Supports multiple file formats: PDF, DOCX, JPG, PNG, up to 10MB each',
      'Upload progress is displayed with percentage',
      'Files are scanned for viruses before storage',
      'User can preview uploaded files without downloading',
      'Files can be organized into folders',
      'User can delete or rename uploaded files'
    ],
    storyPoints: 8,
    testData: {
      userInputs: [
        'Upload single 2MB PDF file',
        'Upload 5 images simultaneously (15MB total)',
        'Upload file with special characters in filename',
        'Attempt to upload 50MB video (should fail)',
        'Upload same file twice (duplicate detection)'
      ],
      edgeCases: [
        'Network interruption during upload',
        'Upload file with virus signature',
        'Browser memory limit with very large file',
        'Upload file with Unicode filename',
        'Concurrent uploads from multiple tabs'
      ],
      apiResponses: [
        { endpoint: '/api/files/upload', method: 'POST', status: 200, body: { fileId: 'f_123', url: 'https://cdn.example.com/files/doc.pdf', size: 2048576 } },
        { endpoint: '/api/files/upload', method: 'POST', status: 413, body: { error: 'File size exceeds 10MB limit' } }
      ],
      codeSnippets: [
        `const uploadFile = async (file: File, onProgress: (percent: number) => void) => {\n  const formData = new FormData();\n  formData.append('file', file);\n  const xhr = new XMLHttpRequest();\n  xhr.upload.addEventListener('progress', (e) => {\n    if (e.lengthComputable) {\n      onProgress((e.loaded / e.total) * 100);\n    }\n  });\n  return new Promise((resolve, reject) => {\n    xhr.onload = () => resolve(JSON.parse(xhr.responseText));\n    xhr.onerror = reject;\n    xhr.open('POST', '/api/files/upload');\n    xhr.send(formData);\n  });\n};`
      ]
    },
    devNotes: 'Technical considerations: Use cloud storage (S3/Azure Blob), implement chunked uploads for large files, add virus scanning with ClamAV, generate thumbnails for images, compress files before storage.'
  },
  {
    keywords: ['report', 'export', 'data', 'generate', 'pdf'],
    title: 'Automated Report Generation',
    description: 'As a manager, I want to generate automated reports of team performance so that I can track progress and identify areas for improvement.',
    acceptanceCriteria: [
      'Reports can be generated on-demand or scheduled (daily, weekly, monthly)',
      'Reports include charts, tables, and summary statistics',
      'User can customize report parameters (date range, metrics, format)',
      'Reports are generated within 30 seconds',
      'Generated reports are saved and accessible in report history',
      'Reports can be shared via email or download link'
    ],
    storyPoints: 13,
    testData: {
      userInputs: [
        'Generate weekly team performance report',
        'Schedule monthly sales report for every 1st of month',
        'Export report as PDF with custom logo',
        'Generate report for specific date range: Jan 1 - Jan 31',
        'Create report comparing two teams'
      ],
      edgeCases: [
        'Report generation with no data available',
        'Very large report (1000+ pages)',
        'Report generation during system maintenance',
        'Scheduled report when user account is deactivated',
        'Report with complex nested data structures'
      ],
      apiResponses: [
        { endpoint: '/api/reports/generate', method: 'POST', status: 200, body: { reportId: 'r_789', status: 'processing' } },
        { endpoint: '/api/reports/r_789', method: 'GET', status: 200, body: { status: 'completed', downloadUrl: '/reports/team-performance-2024-01.pdf' } }
      ],
      codeSnippets: [
        `const generateReport = async (params: ReportParams) => {\n  const response = await fetch('/api/reports/generate', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify(params)\n  });\n  const { reportId } = await response.json();\n  return pollReportStatus(reportId);\n};`
      ]
    },
    devNotes: 'Technical considerations: Use background jobs for generation (Bull/Redis), implement PDF library (Puppeteer/PDFKit), add template system for report layouts, cache frequently generated reports.'
  }
];

export function generateMockStory(rawInput: string, customPrompt?: string) {
  // Valid Fibonacci values for story points
  const fibonacciPoints = [1, 2, 3, 5, 8, 13];
  
  // Randomly select a template for demo purposes (no keyword matching needed)
  const randomIndex = Math.floor(Math.random() * storyTemplates.length);
  const selectedTemplate = storyTemplates[randomIndex];
  
  // Select random Fibonacci points (weighted towards middle values: 3, 5, 8)
  const weightedFibonacci = [3, 3, 5, 5, 5, 8, 8, 13];
  const variablePoints = weightedFibonacci[Math.floor(Math.random() * weightedFibonacci.length)];
  
  return {
    title: selectedTemplate.title,
    description: selectedTemplate.description,
    acceptanceCriteria: [...selectedTemplate.acceptanceCriteria],
    storyPoints: variablePoints,
    testData: selectedTemplate.testData,
    devNotes: selectedTemplate.devNotes
  };
}
