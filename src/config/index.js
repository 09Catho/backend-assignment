require('dotenv').config();

const config = {
  // Server Configuration
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  apiVersion: process.env.API_VERSION || 'v1',

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // Priority Score Configuration
  priority: {
    alpha: parseFloat(process.env.PRIORITY_ALPHA) || 0.4,
    beta: parseFloat(process.env.PRIORITY_BETA) || 0.6,
  },

  // Grace Period Configuration (in minutes)
  gracePeriod: {
    minutes: parseInt(process.env.GRACE_PERIOD_MINUTES, 10) || 15,
  },

  // Pagination Configuration
  pagination: {
    defaultLimit: parseInt(process.env.DEFAULT_PAGE_LIMIT, 10) || 20,
    maxLimit: parseInt(process.env.MAX_PAGE_LIMIT, 10) || 100,
    maxConversationFetch: parseInt(process.env.MAX_CONVERSATION_FETCH, 10) || 100,
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

// Validate required configuration
const validateConfig = () => {
  const required = [
    'database.url',
  ];

  const missing = required.filter(key => {
    const value = key.split('.').reduce((obj, k) => obj?.[k], config);
    return !value;
  });

  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
};

// Only validate in production
if (config.env === 'production') {
  validateConfig();
}

module.exports = config;
