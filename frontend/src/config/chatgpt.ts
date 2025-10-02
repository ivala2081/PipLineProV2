/**
 * ChatGPT Configuration
 * Handles API key management and configuration
 */

export const validateApiKey = (apiKey: string): boolean => {
  return Boolean(apiKey) && apiKey.startsWith('sk-') && apiKey.length > 20;
};

// Check for environment variable first, then fallback to a placeholder
const getApiKey = () => {
  const envKey = import.meta.env.VITE_CHATGPT_API_KEY;
  if (envKey && validateApiKey(envKey)) {
    return envKey;
  }
  return null; // Return null instead of a hardcoded key
};

export const CHATGPT_CONFIG = {
  API_KEY: getApiKey(),
  MODEL: 'gpt-3.5-turbo',
  MAX_TOKENS: 1000,
  TEMPERATURE: 0.7,
  API_URL: 'https://api.openai.com/v1/chat/completions',
  ENABLED: Boolean(getApiKey()),
};

export const SYSTEM_PROMPT = `You are a helpful AI assistant integrated into PipLinePro, a comprehensive financial management system. 

Your role is to:
- Provide clear, concise, and accurate responses
- Help users understand their financial data and business insights
- Assist with data analysis and interpretation
- Answer general business and technical questions
- Maintain a professional and helpful tone

Focus areas:
- Financial data analysis and insights
- Business intelligence and reporting
- Transaction processing and PSP management
- Client relationship management
- System usage and troubleshooting

Always be helpful, accurate, and maintain user privacy and data security.`;

export default CHATGPT_CONFIG;
