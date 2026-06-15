import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Menu, Send, X, Download, MessageSquare, Mic, Square, EyeOff } from 'lucide-react';

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
  const [showChat, setShowChat] = useState(true);
  const [panelWidth, setPanelWidth] = useState(288);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showPanel, setShowPanel] = useState(true);
  const [micError, setMicError] = useState('');

  const chatAreaRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);
  const isThinkingRef = useRef(false);
  const apiKeyRef = useRef(apiKey);
  const messagesRef = useRef<Message[]>([]);
  const currentModeRef = useRef('conversation');
  const currentLevelRef = useRef('intermediate');
  const isDraggingRef = useRef(false);
  const isListeningRef = useRef(false);

  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
  useEffect(() => { apiKeyRef.current = apiKey; }, [apiKey]);
  useEffect(() => { currentModeRef.current = currentMode; }, [currentMode]);
  useEffect(() => { currentLevelRef.current = currentLevel; }, [currentLevel]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setShowPanel(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const handleDragStart = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    const startX = e.clientX;
    const startWidth = panelWidth;
    const onMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      setPanelWidth(Math.min(600, Math.max(180, startWidth + ev.clientX - startX)));
    };
    const onUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const addMessage = useCallback((role: 'user' | 'bot', content: string) => {
    setMessages(prev => {
      const next = [...prev, { role, content }];
      messagesRef.current = next;
      return next;
    });
    setTimeout(() => {
      if (chatAreaRef.current) chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }, 50);
  }, []);

  const speakNatural = useCallback((text: string) => {
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
    if (!window.speechSynthesis.getVoices().length) {
      window.speechSynthesis.onvoiceschanged = applyVoice;
    }

    const done = () => {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      setStatus('ready');
    };
    utt.onend = done;
    utt.onerror = done;
    window.speechSynthesis.speak(utt);
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    setStatus('ready');
  }, []);

  const callGroqAI = useCallback(async (userText: string): Promise<string> => {
    const key = apiKeyRef.current;
    if (!key?.startsWith('gsk_')) throw new Error('Valid Groq API key required');
    const systemPrompts: Record<string, string> = {
      conversation: `You are Ms. Maria, a kind English tutor. Student level: ${currentLevelRef.current}. Reply in 2-3 sentences max. Gently correct grammar mistakes with "(correction: ...)". English only.`,
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
          ...messagesRef.current.slice(-8).map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
          { role: 'user', content: userText },
        ],
        max_tokens: 300,
        temperature: 0.68,
      }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'API error'); }
    return (await res.json()).choices[0].message.content;
  }, []);

  const processUserInput = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isThinkingRef.current) return;
    if (!apiKeyRef.current) {
      addMessage('bot', "Please add your Groq API key. Tap ☰ menu.");
      speakNatural("Please add your Groq API key first.");
      return;
    }
    isThinkingRef.current = true;
    addMessage('user', trimmed);
    setStatus('thinking');
    try {
      const reply = await callGroqAI(trimmed);
      addMessage('bot', reply);
      speakNatural(reply);
    } catch (err) {
      addMessage('bot', `⚠️ ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('ready');
    } finally {
      isThinkingRef.current = false;
    }
  }, [addMessage, speakNatural, callGroqAI]);

  // Greeting
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

  // ── MIC: simple tap-to-listen ──
  const handleMicPress = useCallback(() => {
    setMicError('');

    if (isListeningRef.current) {
      // Stop listening
      try { recRef.current?.stop(); } catch (_) {}
      return;
    }

    if (isSpeakingRef.current || isThinkingRef.current) return;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setMicError('Browser tidak support Speech Recognition. Coba Chrome.');
      return;
    }

    // Create fresh instance every time
    const rec = new SR();
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = false;
    recRef.current = rec;

    rec.onstart = () => {
      isListeningRef.current = true;
      setIsListening(true);
      setStatus('listening');
    };

    rec.onresult = (e: any) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) text += e.results[i][0].transcript;
      }
      if (text.trim()) processUserInput(text.trim());
    };

    rec.onerror = (e: any) => {
      isListeningRef.current = false;
      setIsListening(false);
      setStatus('ready');
      if (e.error === 'not-allowed') {
        setMicError('Izin mikrofon ditolak. Buka Settings browser dan izinkan mikrofon.');
      } else if (e.error === 'no-speech') {
        setMicError('Tidak ada suara terdeteksi. Coba lagi.');
      }
    };

    rec.onend = () => {
      isListeningRef.current = false;
      setIsListening(false);
      if (!isSpeakingRef.current && !isThinkingRef.current) setStatus('ready');
    };

    try {
      rec.start();
    } catch (err) {
      setMicError('Gagal mulai mikrofon. Coba lagi.');
      isListeningRef.current = false;
      setIsListening(false);
      setStatus('ready');
    }
  }, [processUserInput]);

  const downloadConversation = useCallback(() => {
    if (messages.length === 0) return;
    const now = new Date();
    let text = `English Tutoring Session - Ms. Maria\nDate: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}\nMode: ${currentMode} | Level: ${currentLevel}\n${'='.repeat(50)}\n\n`;
    messages.forEach(m => { text += `[${m.role === 'user' ? 'You' : 'Ms. Maria'}]\n${m.content}\n\n`; });
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MsMaria-${now.toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages, currentMode, currentLevel]);

  const handleSaveApiKey = useCallback(() => {
    if (apiKey.startsWith('gsk_')) {
      localStorage.setItem('eng_tutor_groq', apiKey);
      apiKeyRef.current = apiKey;
      addMessage('bot', "✅ API key saved! Let's start learning English!");
      speakNatural("API key saved. Let's start!");
      setShowMenu(false);
    } else {
      alert('Please enter a valid Groq API key starting with gsk_');
    }
  }, [apiKey, addMessage, speakNatural]);

  const handleSendManual = useCallback(() => {
    if (manualInput.trim()) {
      processUserInput(manualInput);
      setManualInput('');
    }
  }, [manualInput, processUserInput]);

  const ChatPanel = () => (
    <div
      className="relative z-10 flex flex-col h-full bg-black/85 backdrop-blur-md border-r border-white/10"
      style={{ width: isMobile ? '85vw' : panelWidth, maxWidth: isMobile ? '360px' : undefined }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${
            status === 'ready'     ? 'bg-emerald-400' :
            status === 'listening' ? 'bg-orange-400' :
            status === 'thinking'  ? 'bg-yellow-400 animate-pulse' :
            'bg-blue-400 animate-pulse'
          }`} />
          <span className="text-xs font-medium text-white/80 truncate">
            {status === 'ready'     ? 'Ready' :
             status === 'listening' ? '🎤 Listening...' :
             status === 'thinking'  ? '💭 Thinking...' :
             '🔊 Speaking...'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={downloadConversation} disabled={messages.length === 0}
            title="Download conversation"
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-green-500/40 disabled:opacity-30 flex items-center justify-center">
            <Download className="w-3.5 h-3.5 text-white" />
          </button>
          <button onClick={() => setShowChat(v => !v)}
            className={`w-7 h-7 rounded-full flex items-center justify-center ${showChat ? 'bg-blue-500/40' : 'bg-white/10'}`}>
            {showChat ? <MessageSquare className="w-3.5 h-3.5 text-blue-300" /> : <EyeOff className="w-3.5 h-3.5 text-white/50" />}
          </button>
          <button onClick={() => setShowMenu(v => !v)}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
            {showMenu ? <X className="w-3.5 h-3.5 text-white" /> : <Menu className="w-3.5 h-3.5 text-white" />}
          </button>
          {isMobile && (
            <button onClick={() => setShowPanel(false)}
              className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center ml-1">
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={chatAreaRef}
        className="overflow-y-auto p-3 flex flex-col gap-3"
        style={{ flex: '1 1 0', minHeight: 0, display: showChat ? 'flex' : 'none' }}
      >
        {messages.length === 0 && (
          <p className="text-white/25 text-xs text-center mt-10">Conversation will appear here...</p>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className="flex flex-col gap-1">
            <span className={`text-[10px] px-1 ${msg.role === 'user' ? 'text-blue-300/60 text-right' : 'text-white/30'}`}>
              {msg.role === 'user' ? 'You' : 'Ms. Maria'}
            </span>
            <div className={`w-full px-3 py-2.5 rounded-xl text-xs leading-relaxed break-words whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-blue-600/80 text-white'
                : 'bg-white/8 text-white/85 border border-white/10'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-white/10 shrink-0 flex flex-col gap-2">
        {inputMode === 'mic' ? (
          <>
            {/* Mic button */}
            <button
              onClick={handleMicPress}
              disabled={isSpeaking || isThinkingRef.current}
              className={`w-full py-3 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                isListening
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/40'
                  : isSpeaking || status === 'thinking'
                    ? 'bg-white/5 text-white/30 cursor-not-allowed border border-white/10'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              <Mic className={`w-4 h-4 ${isListening ? 'animate-pulse' : ''}`} />
              {isListening ? 'Listening... (tap to stop)' : isSpeaking ? '🔊 Ms. Maria speaking...' : status === 'thinking' ? '💭 Thinking...' : 'Tap to Speak'}
            </button>

            {/* Stop AI button */}
            {isSpeaking && (
              <button onClick={stopSpeaking}
                className="w-full py-2 rounded-full text-xs font-medium flex items-center justify-center gap-2 bg-red-500/20 border border-red-400/50 hover:bg-red-500/40 text-red-300">
                <Square className="w-3 h-3 fill-red-300" /> Stop Ms. Maria
              </button>
            )}

            {/* Error message */}
            {micError && (
              <p className="text-red-400 text-xs text-center px-2">{micError}</p>
            )}
          </>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendManual()}
              placeholder="Type in English..."
              className="flex-1 bg-white/10 border border-white/15 rounded-full px-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-blue-400 min-w-0"
            />
            <button onClick={handleSendManual}
              className="w-7 h-7 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center shrink-0">
              <Send className="w-3 h-3 text-white" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex w-full h-screen overflow-hidden bg-black">

      {/* Mobile overlay */}
      {isMobile && showPanel && (
        <div className="absolute inset-0 z-30 flex">
          <ChatPanel />
          <div className="flex-1 bg-black/60" onClick={() => setShowPanel(false)} />
        </div>
      )}

      {/* Desktop panel */}
      {!isMobile && <ChatPanel />}

      {/* Drag handle */}
      {!isMobile && (
        <div onMouseDown={handleDragStart}
          className="w-1 h-full bg-white/10 hover:bg-blue-400/60 cursor-col-resize transition-colors shrink-0 z-20" />
      )}

      {/* Teacher */}
      <div className="relative flex-1 h-full">
        <img
          src="/teacher.png"
          alt="Ms. Maria"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: '50% 10%' }}
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

        {/* Mobile open panel */}
        {isMobile && !showPanel && (
          <button onClick={() => setShowPanel(true)}
            className="absolute top-4 left-4 z-20 w-10 h-10 bg-black/60 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center">
            <Menu className="w-5 h-5 text-white" />
          </button>
        )}

        {/* Mobile mic button floating */}
        {isMobile && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
            <button
              onClick={handleMicPress}
              disabled={isSpeaking}
              className={`px-6 h-12 rounded-full flex items-center gap-2 border-2 font-semibold text-sm transition-all ${
                isListening
                  ? 'bg-orange-500 border-orange-400 text-white'
                  : isSpeaking
                    ? 'bg-black/60 border-white/20 text-white/40 cursor-not-allowed'
                    : 'bg-blue-600 border-blue-400 text-white'
              }`}
            >
              <Mic className={`w-5 h-5 ${isListening ? 'animate-pulse' : ''}`} />
              {isListening ? 'Stop' : isSpeaking ? '🔊' : 'Speak'}
            </button>
            {isSpeaking && (
              <button onClick={stopSpeaking}
                className="w-12 h-12 rounded-full bg-red-500/30 border-2 border-red-400/60 flex items-center justify-center">
                <Square className="w-5 h-5 text-red-400 fill-red-400" />
              </button>
            )}
          </div>
        )}

        {/* Name tag */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md rounded-full px-4 py-1.5 border border-white/10">
          <span className="text-sm font-medium text-white">Ms. Maria · English Tutor AI</span>
        </div>
      </div>

      {/* Menu */}
      {showMenu && (
        <div className={`absolute z-50 w-64 bg-gray-950/97 backdrop-blur-xl rounded-2xl border border-white/10 p-4 shadow-2xl flex flex-col gap-3 ${
          isMobile ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : 'top-14 left-4'
        }`}>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">🔑 Groq API Key</p>
            <div className="flex gap-2">
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                placeholder="gsk_..."
                className="flex-1 bg-gray-800 border border-gray-600 rounded-full px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none min-w-0" />
              <button onClick={handleSaveApiKey}
                className="bg-blue-600 text-white rounded-full px-3 py-1.5 text-xs font-bold shrink-0">Save</button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Free key: <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-blue-400">console.groq.com</a></p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">📘 Mode</p>
            <div className="grid grid-cols-2 gap-1.5">
              {['conversation','grammar','vocabulary','roleplay'].map(m => (
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
              {['beginner','intermediate','advanced'].map(l => (
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
              {(['mic','chat'] as const).map(m => (
                <button key={m} onClick={() => setInputMode(m)}
                  className={`flex-1 py-1.5 rounded-full text-xs font-medium ${inputMode === m ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}>
                  {m === 'mic' ? '🎙️ Mic' : '⌨️ Type'}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setShowMenu(false)}
            className="w-full py-1.5 rounded-full text-xs bg-gray-800 text-gray-400">Close</button>
        </div>
      )}
    </div>
  );
}
