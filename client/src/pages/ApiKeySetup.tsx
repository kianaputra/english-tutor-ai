import React, { useState } from 'react';
import { ExternalLink, Key, ChevronRight, Eye, EyeOff } from 'lucide-react';

interface ApiKeySetupProps {
  onComplete: (apiKey: string) => void;
}

export default function ApiKeySetup({ onComplete }: ApiKeySetupProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed.startsWith('gsk_')) {
      setError('API key must start with "gsk_". Please check and try again.');
      return;
    }

    setLoading(true);
    setError('');

    // Test the API key with a minimal request
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${trimmed}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        }),
      });

      if (res.ok) {
        localStorage.setItem('eng_tutor_groq', trimmed);
        onComplete(trimmed);
      } else {
        const err = await res.json();
        setError(err.error?.message || 'Invalid API key. Please check and try again.');
      }
    } catch {
      setError('Connection error. Please check your internet and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black flex items-center justify-center px-6">

      {/* Background */}
      <img src="/teacher.png" alt="Ms. Maria"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: '50% 10%', filter: 'brightness(0.35)' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-blue-600/30 border border-blue-400/40 flex items-center justify-center mx-auto mb-3">
            <Key className="w-6 h-6 text-blue-300" />
          </div>
          <h1 className="text-2xl font-bold text-white">One Last Step!</h1>
          <p className="text-white/50 text-sm mt-1">Set up your free AI access key</p>
        </div>

        {/* Card body */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl p-6 shadow-2xl">

          {/* Step guide */}
          <div className="mb-5 flex flex-col gap-3">
            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">How to get your free API key:</p>

            {[
              { step: '1', text: 'Open Groq Console', sub: 'Click the button below', link: 'https://console.groq.com/keys' },
              { step: '2', text: 'Sign up / Log in', sub: 'Free account, no credit card needed' },
              { step: '3', text: 'Create API Key', sub: 'Click "Create API Key" → copy the key' },
            ].map(({ step, text, sub, link }) => (
              <div key={step} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-blue-600/60 text-blue-200 text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">{step}</span>
                <div className="flex-1">
                  <p className="text-white/90 text-sm font-medium">{text}</p>
                  <p className="text-white/40 text-xs">{sub}</p>
                </div>
                {link && (
                  <a href={link} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 border border-blue-400/30 rounded-full px-2.5 py-1 transition-colors">
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 my-4" />

          {/* Input */}
          <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-2">Paste your API key here:</p>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="gsk_..."
              className={`w-full bg-white/10 border rounded-xl px-4 py-3 pr-10 text-white text-sm placeholder-white/20 outline-none transition-colors ${
                error ? 'border-red-400/70' : 'border-white/20 focus:border-blue-400'
              }`}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && <p className="text-red-400 text-xs mt-2">❌ {error}</p>}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading || !apiKey.trim()}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                Start Learning with Ms. Maria
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-white/25 text-xs text-center mt-3">
            Your key is stored locally on your device only
          </p>
        </div>
      </div>
    </div>
  );
}
