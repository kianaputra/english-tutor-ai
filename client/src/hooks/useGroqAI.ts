import { useState, useCallback } from 'react';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface UseGroqAIOptions {
  apiKey: string;
  mode?: 'conversation' | 'grammar' | 'vocabulary' | 'roleplay';
  level?: 'beginner' | 'intermediate' | 'advanced';
}

const SYSTEM_PROMPTS = {
  conversation: (level: string) =>
    `You are Ms. Maria, a kind and professional English tutor. Student level: ${level}. Respond in natural English, 2-3 sentences. If there are grammar mistakes, correct them gently inline with "(correction: ...)". Use only English, no Indonesian. Keep friendly and encouraging.`,

  grammar: (level: string) =>
    `You are Ms. Maria, grammar expert. Level: ${level}. Analyze ALL grammar mistakes. Format:
**Corrected:** [full corrected sentence]
**Mistakes:** - [explanation in English]
**Grammar Tip:** [short rule in English]
English only. No Indonesian.`,

  vocabulary: () =>
    `You are Ms. Maria. Teach 3-5 words with:
• Word (pronunciation hint): meaning + example sentence.
All in English. No Indonesian.`,

  roleplay: (level: string) =>
    `You are Ms. Maria, roleplay partner. Level: ${level}. Stay in character, natural English dialogue. End with 💡 Tip: [helpful phrase]. English only.`,
};

export function useGroqAI(options: UseGroqAIOptions) {
  const { apiKey, mode = 'conversation', level = 'intermediate' } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    setMessages(prev => [...prev, { role, content }]);
  }, []);

  const callAPI = useCallback(
    async (userMessage: string): Promise<string> => {
      if (!apiKey || !apiKey.startsWith('gsk_')) {
        throw new Error('Valid Groq API key required');
      }

      setIsLoading(true);
      setError(null);

      try {
        const systemPrompt = SYSTEM_PROMPTS[mode](level);

        const requestMessages = [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-8),
          { role: 'user', content: userMessage },
        ];

        const response = await fetch('/api/chat', {  // tidak perlu apiKey
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: requestMessages, ... }),
        });
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: requestMessages,
            max_tokens: 550,
            temperature: 0.68,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'API error');
        }

        const data = await response.json();
        const assistantMessage = data.choices[0].message.content;

        // Add both user and assistant messages to history
        addMessage('user', userMessage);
        addMessage('assistant', assistantMessage);

        return assistantMessage;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [apiKey, mode, level, messages, addMessage]
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    callAPI,
    addMessage,
    clearHistory,
  };
}
