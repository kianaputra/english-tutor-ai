import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Menu, Mic, MicOff, Send, X } from 'lucide-react';

interface Message {
  role: 'user' | 'bot';
  content: string;
}

const MOUTH_FRAMES = [
  [0.15, '40%'],
  [0.35, '45%'],
  [0.55, '50%'],
  [0.35, '45%'],
  [0.2, '40%'],
  [0.45, '48%'],
  [0.6, '50%'],
  [0.3, '44%'],
];

export default function TutorPageMediaPipe() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState<'ready' | 'listening' | 'thinking' | 'speaking'>('ready');
  const [apiKey, setApiKey] = useState(localStorage.getItem('eng_tutor_groq') || '');
  const [showMenu, setShowMenu] = useState(false);
  const [currentMode, setCurrentMode] = useState('conversation');
  const [currentLevel, setCurrentLevel] = useState('intermediate');
  const [inputMode, setInputMode] = useState<'mic' | 'chat'>('mic');
  const [manualInput, setManualInput] = useState('');
  const [mouthFrame, setMouthFrame] = useState(0);
  const [mouthOpen, setMouthOpen] = useState(false);

  const chatAreaRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const mouthAnimRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameIndexRef = useRef(0);

  const startMouthAnimation = useCallback(() => {
    setMouthOpen(true);
    const animate = () => {
      frameIndexRef.current = (frameIndexRef.current + 1) % MOUTH_FRAMES.length;
      setMouthFrame(frameIndexRef.current);
      mouthAnimRef.current = setTimeout(animate, 80 + Math.random() * 60);
    };
    mouthAnimRef.current = setTimeout(animate, 80);
  }, []);

  const stopMouthAnimation = useCallback(() => {
    if (mouthAnimRef.current) {
      clearTimeout(mouthAnimRef.current);
      mouthAnimRef.current = null;
    }
    setMouthOpen(false);
    setMouthFrame(0);
  }, []);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    recognitionRef.current = new SR();
    recognitionRef.current.lang = 'en-US';
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.onstart = () => { setIsListening(true); setStatus('listening'); };
    recognitionRef.current.onresult = (event: any) => {
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
      }
      if (finalText) { recognitionRef.current.stop(); processUserInput(finalText); }
    };
    recognitionRef.current.onerror = () => { setIsListening(false); setStatus('ready'); };
    recognitionRef.current.onend = () => {
      setIsListening(false);
      if (inputMode === 'mic' && !isSpeaking) setTimeout(() => startListening(), 600);
    };
  }, [inputMode, isSpeaking]);

  useEffect(() => {
    setTimeout(() => triggerGreeting(), 1200);
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isSpeaking && !isListening) {
      try { recognitionRef.current.start(); } catch (_) {}
    }
  };

  const speakNatural = (text: string) => {
    if (!text.trim() || isSpeaking) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    setStatus('speaking');
    startMouthAnimation();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.88;
    utterance.pitch = 1.1;
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
        voices.find(v => v.lang === 'en-US') ||
        voices.find(v => v.lang.startsWith('en'));
      if (preferred) utterance.voice = preferred;
    };
    setVoice();
    if (window.speechSynthesis.getVoices().length === 0) window.speechSynthesis.onvoiceschanged = setVoice;
    utterance.onend = () => { setIsSpeaking(false); setStatus('ready'); stopMouthAnimation(); if (inputMode === 'mic') setTimeout(() => startListening(), 300); };
    utterance.onerror = () => { setIsSpeaking(false); setStatus('ready'); stopMouthAnimation(); };
    window.speechSynthesis.speak(utterance);
  };

  const callGroqAI = async (userText: string): Promise<string> => {
    if (!apiKey?.startsWith('gsk_')) throw new Error('Valid Groq API key required');
    const systemPrompts: Record<string, string> = {
      conversation: `You are Ms. Maria, a kind and professional English tutor. Student level: ${currentLevel}. Respond in natural English, 2-3 sentences. Gently correct grammar mistakes inline with "(correction: ...)". English only.`,
      grammar: `You are Ms. Maria, grammar expert. Level: ${currentLevel}. Analyze ALL grammar mistakes. Format: **Corrected:** [sentence] **Mistakes:** - [explanation] **Grammar Tip:** [rule]. English only.`,
      vocabulary: `You are Ms. Maria. Teach 3-5 words with: • Word (pronunciation): meaning + example. English only.`,
      roleplay: `You are Ms. Maria, roleplay partner. Level: ${currentLevel}. Natural English dialogue. End with 💡 Tip: [phrase]. English only.`,
    };
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompts[currentMode] || systemPrompts.conversation },
          ...messages.slice(-8).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
          { role: 'user', content: userText },
        ],
        max_tokens: 550,
        temperature: 0.68,
      }),
    });
    if (!response.ok) { const err = await response.json(); throw new Error(err.error?.message || 'API error'); }
    const data = await response.json();
    return data.choices[0].message.content;
  };

  const addMessage = (role: 'user' | 'bot', content: string) => {
    setMessages(prev => [...prev, { role, content }]);
    setTimeout(() => { if (chatAreaRef.current) chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight; }, 50);
  };

  const processUserInput = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!apiKey) { addMessage('bot', "Please add your Groq API key first. Tap the ☰ menu button."); speakNatural("Please add your Groq API key first."); return; }
    addMessage('user', trimmed);
    setStatus('thinking');
    try {
      const reply = await callGroqAI(trimmed);
      addMessage('bot', reply);
      speakNatural(reply);
    } catch (err) {
      addMessage('bot', `⚠️ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('ready');
    }
  };

  const triggerGreeting = () => {
    const greetings = [
      "Hello! I'm Ms. Maria, your English tutor. How are you today?",
      "Welcome! I'm Ms. Maria. Ready to practice English together?",
      "Hi there! I'm Ms. Maria. What would you like to practice today?",
    ];
    const msg = greetings[Math.floor(Math.random() * greetings.length)];
    addMessage('bot', msg);
    speakNatural(msg);
  };

  const handleSaveApiKey = () => {
    if (apiKey.startsWith('gsk_')) {
      localStorage.setItem('eng_tutor_groq', apiKey);
      addMessage('bot', "✅ API key saved! Let's start learning English!");
      speakNatural("API key saved. Let's start!");
      setShowMenu(false);
    } else {
      alert('Please enter a valid Groq API key starting with gsk_');
    }
  };

  const handleSendManual = () => {
    if (manualInput.trim()) { processUserInput(manualInput); setManualInput(''); }
  };

  const frame = MOUTH_FRAMES[mouthFrame];
  const mouthScaleY = mouthOpen ? (frame[0] as number) : 0.08;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">

      {/* Teacher image - fullscreen */}
      <img
        src="/teacher.png"
        alt="Ms. Maria"
        className="absolute inset-0 w-full h-full object-cover object-top"
        style={{
          filter: isSpeaking ? 'brightness(1.05) drop-shadow(0 0 30px rgba(180,210,255,0.25))' : 'brightness(1)',
          transition: 'filter 0.3s ease',
        }}
      />

      {/* Mouth animation overlay - positioned at ~62% from top, centered */}
      <div
        className="absolute pointer-events-none"
        style={{ left: '50%', top: '62%', transform: 'translate(-50%, -50%)', width: '7vw', minWidth: '40px', maxWidth: '70px', aspectRatio: '2.2/1', zIndex: 10 }}
      >
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(150, 55, 55, 0.88)',
          borderRadius: frame[1] as string,
          transform: `scaleY(${mouthScaleY})`,
          transformOrigin: 'center',
          transition: 'transform 0.06s ease, border-radius 0.06s ease',
          boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
        }} />
        {mouthOpen && mouthScaleY > 0.2 && (
          <div style={{
            position: 'absolute', left: '15%', right: '15%', top: '15%', bottom: '15%',
            background: 'rgba(20, 5, 5, 0.92)',
            borderRadius: '40%',
            transform: `scaleY(${mouthScaleY * 0.65})`,
            transformOrigin: 'center',
            transition: 'transform 0.06s ease',
          }} />
        )}
      </div>

      {/* Top gradient */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
      {/* Bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

      {/* Status badge */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/50 backdrop-blur-md rounded-full px-4 py-1.5 border border-white/10">
        <span className={`w-2 h-2 rounded-full ${
          status === 'ready' ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' :
          status === 'listening' ? 'bg-orange-400 shadow-[0_0_6px_#fb923c] animate-pulse' :
          status === 'thinking' ? 'bg-yellow-400 shadow-[0_0_6px_#facc15] animate-pulse' :
          'bg-blue-400 shadow-[0_0_6px_#60a5fa] animate-pulse'
        }`} />
        <span className="text-xs font-medium text-white/90 tracking-wide">
          Ms. Maria · {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      {/* Chat area */}
      <div ref={chatAreaRef} className="absolute top-16 left-1/2 -translate-x-1/2 w-11/12 max-w-sm z-20 flex flex-col gap-2 overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 180px)', scrollBehavior: 'smooth' }}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-blue-600/90 text-white rounded-br-sm'
                : 'bg-black/65 text-white/95 rounded-bl-sm backdrop-blur-md border border-white/10'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-11/12 max-w-sm flex items-center gap-3">
        {inputMode === 'chat' ? (
          <div className="flex-1 flex gap-2">
            <input
              type="text" value={manualInput} onChange={e => setManualInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendManual()}
              placeholder="Type in English..."
              className="flex-1 bg-black/70 backdrop-blur-md border border-white/20 rounded-full px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:border-blue-400"
            />
            <button onClick={handleSendManual} className="w-10 h-10 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center transition-colors">
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : (
          <button onClick={startListening} disabled={isListening || isSpeaking}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-medium transition-all ${
              isListening ? 'bg-orange-500/80 text-white animate-pulse' :
              isSpeaking ? 'bg-blue-600/60 text-white/60 cursor-not-allowed' :
              'bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-white/10'
            }`}>
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            {isSpeaking ? '🔊 Speaking...' : isListening ? '🎤 Listening...' : '🎙️ Tap to speak'}
          </button>
        )}
        <button onClick={() => setShowMenu(!showMenu)}
          className="w-10 h-10 bg-black/60 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
          {showMenu ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
        </button>
      </div>

      {/* Menu panel */}
      {showMenu && (
        <div className="absolute bottom-20 right-4 z-30 w-72 bg-gray-950/95 backdrop-blur-xl rounded-2xl border border-white/10 p-5 shadow-2xl flex flex-col gap-4">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">🔑 Groq API Key</p>
            <div className="flex gap-2">
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="gsk_..."
                className="flex-1 bg-gray-800 border border-gray-600 rounded-full px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-blue-500" />
              <button onClick={handleSaveApiKey} className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-4 py-2 text-xs font-bold transition-colors">Save</button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Free key at <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">console.groq.com</a></p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">📘 Mode</p>
            <div className="grid grid-cols-2 gap-2">
              {['conversation', 'grammar', 'vocabulary', 'roleplay'].map(m => (
                <button key={m} onClick={() => setCurrentMode(m)}
                  className={`py-1.5 rounded-full text-xs font-medium transition-colors ${currentMode === m ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">🎯 Level</p>
            <div className="flex gap-2">
              {['beginner', 'intermediate', 'advanced'].map(l => (
                <button key={l} onClick={() => setCurrentLevel(l)}
                  className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-colors ${currentLevel === l ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">🎤 Input</p>
            <div className="flex gap-2">
              {(['mic', 'chat'] as const).map(m => (
                <button key={m} onClick={() => setInputMode(m)}
                  className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-colors ${inputMode === m ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                  {m === 'mic' ? '🎙️ Mic' : '⌨️ Type'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
