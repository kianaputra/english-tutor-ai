import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Menu, Mic, MicOff, Send, X } from 'lucide-react';

interface Message {
  role: 'user' | 'bot';
  content: string;
}

const MOUTH_FRAMES = [0.08, 0.22, 0.40, 0.55, 0.40, 0.22, 0.10, 0.35, 0.50, 0.30];

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
  const [mouthScale, setMouthScale] = useState(0);

  const chatAreaRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const mouthAnimRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameIndexRef = useRef(0);

  // Stable refs to avoid stale closures
  const isSpeakingRef = useRef(false);
  const isListeningRef = useRef(false);
  const inputModeRef = useRef<'mic' | 'chat'>('mic');
  const apiKeyRef = useRef(apiKey);
  const messagesRef = useRef<Message[]>([]);
  const currentModeRef = useRef('conversation');
  const currentLevelRef = useRef('intermediate');

  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
  useEffect(() => { inputModeRef.current = inputMode; }, [inputMode]);
  useEffect(() => { apiKeyRef.current = apiKey; }, [apiKey]);
  useEffect(() => { currentModeRef.current = currentMode; }, [currentMode]);
  useEffect(() => { currentLevelRef.current = currentLevel; }, [currentLevel]);

  // Mouth animation
  const startMouthAnimation = useCallback(() => {
    frameIndexRef.current = 0;
    const animate = () => {
      frameIndexRef.current = (frameIndexRef.current + 1) % MOUTH_FRAMES.length;
      setMouthScale(MOUTH_FRAMES[frameIndexRef.current]);
      mouthAnimRef.current = setTimeout(animate, 130 + Math.random() * 90);
    };
    setMouthScale(0.2);
    mouthAnimRef.current = setTimeout(animate, 130);
  }, []);

  const stopMouthAnimation = useCallback(() => {
    if (mouthAnimRef.current) { clearTimeout(mouthAnimRef.current); mouthAnimRef.current = null; }
    setMouthScale(0);
  }, []);

  // Setup speech recognition ONCE
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = false;

    rec.onstart = () => { isListeningRef.current = true; setIsListening(true); setStatus('listening'); };
    rec.onresult = (e: any) => {
      const text = e.results[e.results.length - 1][0].transcript.trim();
      if (text) { rec.stop(); processUserInputRef.current(text); }
    };
    rec.onerror = () => { isListeningRef.current = false; setIsListening(false); setStatus('ready'); };
    rec.onend = () => {
      isListeningRef.current = false;
      setIsListening(false);
      // DO NOT auto-restart — user must tap mic button manually
    };

    recognitionRef.current = rec;
    return () => { try { rec.abort(); } catch (_) {} };
  }, []);

  // Greeting on load — no auto-mic
  useEffect(() => {
    const t = setTimeout(() => {
      const greetings = [
        "Hello! I'm Ms. Maria, your English tutor. How are you today?",
        "Welcome! I'm Ms. Maria. Ready to practice English together?",
        "Hi there! I'm Ms. Maria. What would you like to practice today?",
      ];
      const msg = greetings[Math.floor(Math.random() * greetings.length)];
      addMessageDirect('bot', msg);
      speakNaturalDirect(msg);
    }, 1000);
    return () => clearTimeout(t);
  }, []);

  const addMessageDirect = (role: 'user' | 'bot', content: string) => {
    setMessages(prev => {
      const next = [...prev, { role, content }];
      messagesRef.current = next;
      return next;
    });
    setTimeout(() => {
      if (chatAreaRef.current) chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }, 50);
  };

  const speakNaturalDirect = (text: string) => {
    if (!text.trim()) return;
    window.speechSynthesis.cancel();
    isSpeakingRef.current = true;
    setIsSpeaking(true);
    setStatus('speaking');
    startMouthAnimation();

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

    utt.onend = () => {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      setStatus('ready');
      stopMouthAnimation();
      // After speaking, if mic mode → auto-start listening
      if (inputModeRef.current === 'mic') {
        setTimeout(() => {
          if (!isSpeakingRef.current && !isListeningRef.current) {
            try { recognitionRef.current?.start(); } catch (_) {}
          }
        }, 600);
      }
    };
    utt.onerror = () => {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      setStatus('ready');
      stopMouthAnimation();
    };
    window.speechSynthesis.speak(utt);
  };

  const callGroqAI = async (userText: string): Promise<string> => {
    const key = apiKeyRef.current;
    if (!key?.startsWith('gsk_')) throw new Error('Valid Groq API key required');

    const systemPrompts: Record<string, string> = {
      conversation: `You are Ms. Maria, a kind English tutor. Student level: ${currentLevelRef.current}. Reply in 2-3 sentences. Gently correct grammar mistakes inline with "(correction: ...)". English only.`,
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
      addMessageDirect('bot', "Please add your Groq API key first. Tap the ☰ menu.");
      speakNaturalDirect("Please add your Groq API key first.");
      return;
    }
    addMessageDirect('user', trimmed);
    setStatus('thinking');
    try {
      const reply = await callGroqAI(trimmed);
      addMessageDirect('bot', reply);
      speakNaturalDirect(reply);
    } catch (err) {
      addMessageDirect('bot', `⚠️ ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('ready');
    }
  };

  const processUserInputRef = useRef(processUserInput);
  useEffect(() => { processUserInputRef.current = processUserInput; });

  const handleMicButton = () => {
    if (isSpeakingRef.current) return;
    if (isListeningRef.current) {
      try { recognitionRef.current?.stop(); } catch (_) {}
    } else {
      try { recognitionRef.current?.start(); } catch (_) {}
    }
  };

  const handleSaveApiKey = () => {
    if (apiKey.startsWith('gsk_')) {
      localStorage.setItem('eng_tutor_groq', apiKey);
      apiKeyRef.current = apiKey;
      addMessageDirect('bot', "✅ API key saved! Let's start learning English!");
      speakNaturalDirect("API key saved. Let's start!");
      setShowMenu(false);
    } else {
      alert('Please enter a valid Groq API key starting with gsk_');
    }
  };

  const handleSendManual = () => {
    if (manualInput.trim()) { processUserInput(manualInput); setManualInput(''); }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">

      {/* Teacher fullscreen */}
      <img src="/teacher.png" alt="Ms. Maria"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: isSpeaking ? 'brightness(1.04)' : 'brightness(1)', transition: 'filter 0.3s', objectPosition: '50% 14%' }}
      />

      {/* Mouth overlay — adjust top% to match your image */}
      <div className="absolute pointer-events-none"
        style={{
          left: '50%', top: '88%',
          transform: 'translate(-50%, -50%)',
          width: 'clamp(36px, 6vw, 60px)',
          height: 'clamp(16px, 2.5vw, 28px)',
          zIndex: 10,
        }}>
        {/* Lips */}
        <div style={{
          position: 'absolute', inset: 0,
          background: '#8B3A3A',
          borderRadius: '50%',
          transform: `scaleY(${Math.max(mouthScale, 0.05)})`,
          transformOrigin: 'center',
          transition: 'transform 0.12s ease',
          boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.4)',
        }} />
        {/* Dark interior */}
        {mouthScale > 0.18 && (
          <div style={{
            position: 'absolute', left: '20%', right: '20%', top: '20%', bottom: '20%',
            background: '#1a0505',
            borderRadius: '50%',
            transform: `scaleY(${mouthScale * 0.55})`,
            transformOrigin: 'center',
            transition: 'transform 0.12s ease',
          }} />
        )}
      </div>

      {/* Gradients */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-60 bg-gradient-to-t from-black/85 to-transparent pointer-events-none" />

      {/* Status */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/50 backdrop-blur-md rounded-full px-4 py-1.5 border border-white/10">
        <span className={`w-2 h-2 rounded-full ${
          status === 'ready' ? 'bg-emerald-400' :
          status === 'listening' ? 'bg-orange-400 animate-pulse' :
          status === 'thinking' ? 'bg-yellow-400 animate-pulse' :
          'bg-blue-400 animate-pulse'
        }`} />
        <span className="text-xs font-medium text-white/90">
          Ms. Maria · {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      {/* Chat */}
      <div ref={chatAreaRef}
        className="absolute top-16 left-1/2 -translate-x-1/2 w-11/12 max-w-sm z-20 flex flex-col gap-2 overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 180px)' }}>
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
            <input type="text" value={manualInput} onChange={e => setManualInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendManual()} placeholder="Type in English..."
              className="flex-1 bg-black/70 backdrop-blur-md border border-white/20 rounded-full px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:border-blue-400" />
            <button onClick={handleSendManual}
              className="w-10 h-10 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center">
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : (
          <button onClick={handleMicButton} disabled={isSpeaking}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-medium transition-all ${
              isListening ? 'bg-orange-500/80 text-white animate-pulse' :
              isSpeaking ? 'bg-blue-600/50 text-white/50 cursor-not-allowed' :
              'bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-white/10'
            }`}>
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            {isSpeaking ? '🔊 Speaking...' : isListening ? '🎤 Listening... (tap to stop)' : '🎙️ Tap to speak'}
          </button>
        )}
        <button onClick={() => setShowMenu(!showMenu)}
          className="w-10 h-10 bg-black/60 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center hover:bg-white/10">
          {showMenu ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
        </button>
      </div>

      {/* Menu */}
      {showMenu && (
        <div className="absolute bottom-20 right-4 z-30 w-72 bg-gray-950/95 backdrop-blur-xl rounded-2xl border border-white/10 p-5 shadow-2xl flex flex-col gap-4">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">🔑 Groq API Key</p>
            <div className="flex gap-2">
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="gsk_..."
                className="flex-1 bg-gray-800 border border-gray-600 rounded-full px-3 py-2 text-xs text-white placeholder-gray-500 outline-none" />
              <button onClick={handleSaveApiKey} className="bg-blue-600 text-white rounded-full px-4 py-2 text-xs font-bold">Save</button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Free key at <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-blue-400">console.groq.com</a></p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">📘 Mode</p>
            <div className="grid grid-cols-2 gap-2">
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
            <div className="flex gap-2">
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
            <div className="flex gap-2">
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
