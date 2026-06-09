import React, { useEffect, useState, useRef } from 'react';
import { Menu, Send, X } from 'lucide-react';

interface Message {
  role: 'user' | 'bot';
  content: string;
}

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

  const chatAreaRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isActiveRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const inputModeRef = useRef<'mic' | 'chat'>('mic');
  const apiKeyRef = useRef(apiKey);
  const messagesRef = useRef<Message[]>([]);
  const currentModeRef = useRef('conversation');
  const currentLevelRef = useRef('intermediate');

  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { inputModeRef.current = inputMode; }, [inputMode]);
  useEffect(() => { apiKeyRef.current = apiKey; }, [apiKey]);
  useEffect(() => { currentModeRef.current = currentMode; }, [currentMode]);
  useEffect(() => { currentLevelRef.current = currentLevel; }, [currentLevel]);

  const tryStartMic = () => {
    if (inputModeRef.current !== 'mic') return;
    if (isSpeakingRef.current) return;
    if (isActiveRef.current) return;
    try { recognitionRef.current?.start(); } catch (_) {}
  };

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => { isActiveRef.current = true; setIsListening(true); setStatus('listening'); };
    rec.onresult = (e: any) => {
      const text = e.results[e.results.length - 1][0].transcript.trim();
      if (text) { rec.stop(); processUserInputRef.current(text); }
    };
    rec.onerror = () => { isActiveRef.current = false; setIsListening(false); setStatus('ready'); setTimeout(tryStartMic, 600); };
    rec.onend = () => { isActiveRef.current = false; setIsListening(false); setTimeout(tryStartMic, 400); };
    recognitionRef.current = rec;
    return () => { try { rec.abort(); } catch (_) {} };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const greetings = [
        "Hello! I'm Ms. Maria, your English tutor. How are you today?",
        "Welcome! I'm Ms. Maria. Ready to practice English together?",
        "Hi there! I'm Ms. Maria. What would you like to practice today?",
      ];
      const msg = greetings[Math.floor(Math.random() * greetings.length)];
      addMessage('bot', msg);
      speakNatural(msg);
    }, 1000);
    return () => clearTimeout(t);
  }, []);

  const addMessage = (role: 'user' | 'bot', content: string) => {
    setMessages(prev => {
      const next = [...prev, { role, content }];
      messagesRef.current = next;
      return next;
    });
    setTimeout(() => { if (chatAreaRef.current) chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight; }, 50);
  };

  const speakNatural = (text: string) => {
    if (!text.trim()) return;
    window.speechSynthesis.cancel();
    isSpeakingRef.current = true;
    setIsSpeaking(true);
    setStatus('speaking');
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'en-US';
    utt.rate = 0.88;
    utt.pitch = 1.1;
    const applyVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const v = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'))
             || voices.find(v => v.lang === 'en-US')
             || voices.find(v => v.lang.startsWith('en'));
      if (v) utt.voice = v;
    };
    applyVoice();
    if (!window.speechSynthesis.getVoices().length) window.speechSynthesis.onvoiceschanged = applyVoice;
    utt.onend = () => { isSpeakingRef.current = false; setIsSpeaking(false); setStatus('ready'); setTimeout(tryStartMic, 600); };
    utt.onerror = () => { isSpeakingRef.current = false; setIsSpeaking(false); setStatus('ready'); setTimeout(tryStartMic, 600); };
    window.speechSynthesis.speak(utt);
  };

  const callGroqAI = async (userText: string): Promise<string> => {
    const key = apiKeyRef.current;
    if (!key?.startsWith('gsk_')) throw new Error('Valid Groq API key required');
    const systemPrompts: Record<string, string> = {
      conversation: `You are Ms. Maria, a kind English tutor. Student level: ${currentLevelRef.current}. Reply in 2-3 sentences. Gently correct grammar mistakes with "(correction: ...)". English only.`,
      grammar: `You are Ms. Maria, grammar expert. Level: ${currentLevelRef.current}. Format: **Corrected:** [sentence] **Mistakes:** - [explanation] **Tip:** [rule]. English only.`,
      vocabulary: `You are Ms. Maria. Teach 3-5 words: • Word (pronunciation): meaning + example. English only.`,
      roleplay: `You are Ms. Maria, roleplay partner. Level: ${currentLevelRef.current}. Natural dialogue. End with 💡 Tip: [phrase]. English only.`,
    };
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompts[currentModeRef.current] || systemPrompts.conversation },
          ...messagesRef.current.slice(-8).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
          { role: 'user', content: userText },
        ],
        max_tokens: 550,
        temperature: 0.68,
      }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'API error'); }
    return (await res.json()).choices[0].message.content;
  };

  const processUserInput = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!apiKeyRef.current) {
      addMessage('bot', "Please add your Groq API key. Tap ☰ menu.");
      speakNatural("Please add your Groq API key first.");
      return;
    }
    addMessage('user', trimmed);
    setStatus('thinking');
    try {
      const reply = await callGroqAI(trimmed);
      addMessage('bot', reply);
      speakNatural(reply);
    } catch (err) {
      addMessage('bot', `⚠️ ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('ready');
      setTimeout(tryStartMic, 600);
    }
  };

  const processUserInputRef = useRef(processUserInput);
  useEffect(() => { processUserInputRef.current = processUserInput; });

  const handleSaveApiKey = () => {
    if (apiKey.startsWith('gsk_')) {
      localStorage.setItem('eng_tutor_groq', apiKey);
      apiKeyRef.current = apiKey;
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

  return (
    <div className="flex w-full h-screen overflow-hidden bg-black">

      {/* ── LEFT: Chat panel (always visible) ── */}
      <div className="relative z-10 flex flex-col w-72 h-full shrink-0 bg-black/80 backdrop-blur-md border-r border-white/10">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              status === 'ready' ? 'bg-emerald-400' :
              status === 'listening' ? 'bg-orange-400 animate-pulse' :
              status === 'thinking' ? 'bg-yellow-400 animate-pulse' :
              'bg-blue-400 animate-pulse'
            }`} />
            <span className="text-xs font-medium text-white/80 truncate">
              {status === 'ready' ? 'Ready' :
               status === 'listening' ? '🎤 Listening...' :
               status === 'thinking' ? '💭 Thinking...' :
               '🔊 Speaking...'}
            </span>
          </div>
          <button onClick={() => setShowMenu(!showMenu)}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0">
            {showMenu ? <X className="w-3.5 h-3.5 text-white" /> : <Menu className="w-3.5 h-3.5 text-white" />}
          </button>
        </div>

        {/* Messages */}
        <div ref={chatAreaRef} className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {messages.length === 0 && (
            <p className="text-white/25 text-xs text-center mt-10">Conversation will appear here...</p>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-white/10 text-white/90 rounded-bl-sm border border-white/10'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* Input area */}
        <div className="p-3 border-t border-white/10 shrink-0">
          {inputMode === 'mic' ? (
            <div className={`w-full py-2 rounded-full text-xs font-medium text-center border transition-all ${
              isListening ? 'border-orange-400/60 bg-orange-500/15 text-orange-300' :
              isSpeaking  ? 'border-blue-400/60 bg-blue-500/15 text-blue-300' :
                            'border-white/15 bg-white/5 text-white/40'
            }`}>
              {isSpeaking ? '🔊 Speaking...' : isListening ? '🎤 Listening...' : '🎙️ Mic always on'}
            </div>
          ) : (
            <div className="flex gap-2">
              <input type="text" value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendManual()}
                placeholder="Type in English..."
                className="flex-1 bg-white/10 border border-white/15 rounded-full px-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-blue-400 min-w-0" />
              <button onClick={handleSendManual}
                className="w-7 h-7 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                <Send className="w-3 h-3 text-white" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Teacher image ── */}
      <div className="relative flex-1 h-full">
        <img src="/teacher.png" alt="Ms. Maria"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: '50% 10%' }}
        />
        {/* Name tag bottom center */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md rounded-full px-5 py-1.5 border border-white/10">
          <span className="text-sm font-medium text-white">Ms. Maria · English Tutor AI</span>
        </div>
      </div>

      {/* ── MENU ── */}
      {showMenu && (
        <div className="absolute top-14 left-4 z-50 w-64 bg-gray-950/97 backdrop-blur-xl rounded-2xl border border-white/10 p-4 shadow-2xl flex flex-col gap-3">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">🔑 Groq API Key</p>
            <div className="flex gap-2">
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="gsk_..."
                className="flex-1 bg-gray-800 border border-gray-600 rounded-full px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none min-w-0" />
              <button onClick={handleSaveApiKey} className="bg-blue-600 text-white rounded-full px-3 py-1.5 text-xs font-bold shrink-0">Save</button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Free key: <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-blue-400">console.groq.com</a>
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">📘 Mode</p>
            <div className="grid grid-cols-2 gap-1.5">
              {['conversation', 'grammar', 'vocabulary', 'roleplay'].map(m => (
                <button key={m} onClick={() => setCurrentMode(m)}
                  className={`py-1.5 rounded-full text-xs font-medium ${currentMode === m ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">🎯 Level</p>
            <div className="flex gap-1.5">
              {['beginner', 'intermediate', 'advanced'].map(l => (
                <button key={l} onClick={() => setCurrentLevel(l)}
                  className={`flex-1 py-1.5 rounded-full text-xs font-medium ${currentLevel === l ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}>
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">🎤 Input</p>
            <div className="flex gap-1.5">
              {(['mic', 'chat'] as const).map(m => (
                <button key={m} onClick={() => setInputMode(m)}
                  className={`flex-1 py-1.5 rounded-full text-xs font-medium ${inputMode === m ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}>
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
