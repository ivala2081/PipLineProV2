import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  MessageSquare, 
  Sparkles,
  Trash2,
  Settings
} from 'lucide-react';
import { CHATGPT_CONFIG, SYSTEM_PROMPT, validateApiKey } from '../../config/chatgpt';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatGPTInterfaceProps {
  apiKey: string;
  className?: string;
}

const ChatGPTInterface: React.FC<ChatGPTInterfaceProps> = ({ apiKey, className = '' }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if AI is properly configured
  const isConfigured = CHATGPT_CONFIG.ENABLED && validateApiKey(apiKey);

  // Clear any existing errors and messages if not configured
  useEffect(() => {
    if (!isConfigured) {
      if (error) {
        setError(null);
      }
      if (messages.length > 0) {
        setMessages([]);
      }
    }
  }, [isConfigured, error, messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    // Check if AI is properly configured
    if (!isConfigured) {
      setError('AI Assistant is not configured. Please contact your administrator to set up the ChatGPT API key.');
      return;
    }

    // Validate API key
    if (!validateApiKey(apiKey)) {
      setError('Invalid API key. Please check your configuration.');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(CHATGPT_CONFIG.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: CHATGPT_CONFIG.MODEL,
          messages: [
            {
              role: 'system',
              content: SYSTEM_PROMPT
            },
            ...messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            {
              role: 'user',
              content: userMessage.content
            }
          ],
          max_tokens: CHATGPT_CONFIG.MAX_TOKENS,
          temperature: CHATGPT_CONFIG.TEMPERATURE,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.choices[0]?.message?.content || 'Sorry, I could not generate a response.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      console.error('ChatGPT API Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className={`h-full flex flex-col ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">
                AI Assistant
              </CardTitle>
              <p className="text-sm text-slate-600">
                Powered by ChatGPT
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearChat}
              className="text-slate-600 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-slate-600"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px] max-h-[500px]">
          {!isConfigured ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Settings className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                AI Assistant Not Configured
              </h3>
              <p className="text-slate-600 max-w-sm mb-4">
                The AI Assistant feature requires a valid ChatGPT API key to function. Please contact your administrator to configure this feature.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 max-w-sm">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> This is a premium feature that requires OpenAI API access.
                </p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                Start a conversation
              </h3>
              <p className="text-slate-600 max-w-sm">
                Ask me anything about your financial data, business insights, or general questions.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-slate-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-slate-100 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                  <span className="text-sm text-slate-600">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}

          {error && isConfigured && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">
                <strong>Error:</strong> {error}
              </p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-200 p-4">
          <div className="flex gap-2">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isConfigured ? "Ask me anything about your business or data..." : "AI Assistant is not configured"}
              className={`flex-1 resize-none border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
                isConfigured 
                  ? "border-slate-300 focus:ring-purple-500" 
                  : "border-amber-300 bg-amber-50 focus:ring-amber-500"
              }`}
              rows={2}
              disabled={isLoading || !isConfigured}
            />
            <Button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading || !isConfigured}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                isConfigured
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                  : "bg-amber-100 text-amber-600 cursor-not-allowed"
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className={`text-xs mt-2 ${
            isConfigured ? "text-slate-500" : "text-amber-600"
          }`}>
            {isConfigured 
              ? "Press Enter to send, Shift+Enter for new line"
              : "Contact administrator to enable AI Assistant"
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatGPTInterface;
