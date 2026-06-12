import React, { useEffect, useState, useRef } from 'react';
import { Menu, Send, X, Download, MessageSquare, Mic, MicOff, Square, EyeOff } from 'lucide-react';

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
  const [micEnabled, setMicEnabled] = useState(true);
  const [panelWidth, setPanelWidth] = useState(288);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showPanel, setShowPanel] = useState(true);

  const chatAreaRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isActiveRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isThinkingRef = useRef(false);
  const inputModeRef = useRef<'mic' | 'chat'>('mic');
  const micEnabledRef = useRef(true);
  const apiKeyRef = useRef(apiKey);
  const messagesRef = useRef<Message[]>([]);
  const currentModeRef = useRef('conversation');
  const currentLevelRef = useRef('intermediate');
  const isDraggingRef = useRef(false);

  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { inputModeRef.current = inputMode; }, [inputMode]);
  useEffect(() => { apiKeyRef.current = apiKey; }, [apiKey]);
  useEffect(() => { currentModeRef.current = currentMode; }, [currentMode]);
  useEffect(() => { currentLevelRef.current = currentLevel; }, [currentLevel]);

  useEffect(() => {
    micEnabledRef.current = micEnabled;
    if (!micEnabled) {
      try { recognitionRef.current?.abort(); } catch (_) {}
      isActiveRef.current = false; setIsListening(false);
    } else { setTimeout(tryStartMic, 300); }
  }, [micEnabled]);

  // Detect mobile/desktop and resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setShowPanel(false); // hide panel by default on mobile so robot is visible
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

  const tryStartMic = () => {
    if (inputModeRef.current !== 'mic') return;
    if (!micEnabledRef.current) return;
    if (isSpeakingRef.current) return;
    if (isActiveRef.current) return;
    if (isThinkingRef.current) return;
    try { recognitionRef.current?.start(); } catch (_) {}
  };

  // Setup speech recognition ONCE — more responsive timing
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;

    let silenceTimer: ReturnType<typeof setTimeout> | null = null;
    let accumulated = '';

    const clearTimer = () => { if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; } };

    const submit = () => {
      clearTimer();
      const text = accumulated.trim();
      accumulated = '';
      if (text && !isThinkingRef.current && !isSpeakingRef.current) {
        rec.stop();
        processUserInputRef.current(text);
      }
    };

    rec.onstart = () => { isActiveRef.current = true; accumulated = ''; setIsListening(true); setStatus('listening'); };

    rec.onresult = (e: any) => {
      if (isSpeakingRef.current) return;
      let final = '', interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      if (final) {
        accumulated += ' ' + final;
      }
      if (interim || final) {
        // Reset the 10-second silence timer every time user speaks
        clearTimer();
        silenceTimer = setTimeout(submit, 10000);
      }
    };

    rec.onerror = (e: any) => {
      clearTimer(); isActiveRef.current = false; setIsListening(false);
      if (e.error === 'no-speech') setTimeout(tryStartMic, 200);
      else { setStatus('ready'); setTimeout(tryStartMic, 600); }
    };

    rec.onend = () => {
      clearTimer();
      isActiveRef.current = false; setIsListening(false);
      // If we still have accumulated text and the user hasn't been idle long,
      // browser likely auto-stopped due to time limit — restart and keep accumulating
      if (accumulated.trim() && !isThinkingRef.current && !isSpeakingRef.current) {
        setTimeout(() => {
          if (micEnabledRef.current && !isSpeakingRef.current && !isThinkingRef.current) {
            try { rec.start(); } catch (_) {}
          }
        }, 100);
        // Also keep the 10s silence timer running in case user is truly done
        silenceTimer = setTimeout(submit, 10000);
      } else {
        setTimeout(tryStartMic, 300);
      }
    };

    recognitionRef.current = rec;
    return () => { try { rec.abort(); } catch (_) {} };
  }, []);

  // Greeting on load
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
    setMessages(prev => { const next = [...prev, { role, content }]; messagesRef.current = next; return next; });
    setTimeout(() => { if (chatAreaRef.current) chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight; }, 50);
  };

  const speakNatural = (text: string) => {
    if (!text.trim()) return;
    try { recognitionRef.current?.abort(); } catch (_) {}
    isActiveRef.current = false; setIsListening(false);
    window.speechSynthesis.cancel();
    isSpeakingRef.current = true; setIsSpeaking(true); setStatus('speaking');

    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'en-US'; utt.rate = 0.88; utt.pitch = 1.1;

    const applyVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const v = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'))
             || voices.find(v => v.lang === 'en-US')
             || voices.find(v => v.lang.startsWith('en'));
      if (v) utt.voice = v;
    };
    applyVoice();
    if (!window.speechSynthesis.getVoices().length) window.speechSynthesis.onvoiceschanged = applyVoice;

    utt.onend = () => { isSpeakingRef.current = false; setIsSpeaking(false); setStatus('ready'); setTimeout(tryStartMic, 400); };
    utt.onerror = () => { isSpeakingRef.current = false; setIsSpeaking(false); setStatus('ready'); setTimeout(tryStartMic, 400); };
    window.speechSynthesis.speak(utt);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    isSpeakingRef.current = false; setIsSpeaking(false); setStatus('ready'); setTimeout(tryStartMic, 300);
  };

  const callGroqAI = async (userText: string): Promise<string> => {
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
          ...messagesRef.current.slice(-8).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
          { role: 'user', content: userText },
        ],
        max_tokens: 300, temperature: 0.68,
      }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'API error'); }
    return (await res.json()).choices[0].message.content;
  };

  const processUserInput = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isThinkingRef.current || isSpeakingRef.current) return;
    if (!apiKeyRef.current) {
      addMessage('bot', "Please add your Groq API key. Tap ☰ menu.");
      speakNatural("Please add your Groq API key first.");
      return;
    }
    isThinkingRef.current = true;
    addMessage('user', trimmed); setStatus('thinking');
    try {
      const reply = await callGroqAI(trimmed);
      addMessage('bot', reply); speakNatural(reply);
    } catch (err) {
      addMessage('bot', `⚠️ ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('ready'); setTimeout(tryStartMic, 400);
    } finally { isThinkingRef.current = false; }
  };

  const processUserInputRef = useRef(processUserInput);
  useEffect(() => { processUserInputRef.current = processUserInput; });

  const downloadConversation = () => {
    if (messages.length === 0) return;
    const now = new Date();
    let text = `English Tutoring Session - Ms. Maria\nDate: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}\nMode: ${currentMode} | Level: ${currentLevel}\n${'='.repeat(50)}\n\n`;
    messages.forEach(m => { text += `[${m.role === 'user' ? 'You' : 'Ms. Maria'}]\n${m.content}\n\n`; });
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `MsMaria-${now.toISOString().slice(0, 10)}.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleSaveApiKey = () => {
    if (apiKey.startsWith('gsk_')) {
      localStorage.setItem('eng_tutor_groq', apiKey);
      apiKeyRef.current = apiKey;
      addMessage('bot', "✅ API key saved! Let's start learning English!");
      speakNatural("API key saved. Let's start!");
      setShowMenu(false);
    } else alert('Please enter a valid Groq API key starting with gsk_');
  };

  const handleSendManual = () => { if (manualInput.trim()) { processUserInput(manualInput); setManualInput(''); } };

  const ChatPanel = () => (
    <div className="relative z-10 flex flex-col h-full bg-black/85 backdrop-blur-md border-r border-white/10"
      style={{ width: isMobile ? '85vw' : panelWidth, maxWidth: isMobile ? '360px' : undefined }}>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 shrink-0">
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
             status === 'thinking' ? '💭 Thinking...' : '🔊 Speaking...'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={downloadConversation} disabled={messages.length === 0} title="Download"
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-green-500/40 disabled:opacity-30 flex items-center justify-center">
            <Download className="w-3.5 h-3.5 text-white" />
          </button>
          <button onClick={() => setShowChat(!showChat)} title={showChat ? 'Hide chat' : 'Show chat'}
            className={`w-7 h-7 rounded-full flex items-center justify-center ${showChat ? 'bg-blue-500/40' : 'bg-white/10'}`}>
            {showChat ? <MessageSquare className="w-3.5 h-3.5 text-blue-300" /> : <EyeOff className="w-3.5 h-3.5 text-white/50" />}
          </button>
          <button onClick={() => setShowMenu(!showMenu)}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
            {showMenu ? <X className="w-3.5 h-3.5 text-white" /> : <Menu className="w-3.5 h-3.5 text-white" />}
          </button>
          {isMobile && (
            <button onClick={() => setShowPanel(false)} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center ml-1">
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={chatAreaRef} className="overflow-y-auto p-3 flex flex-col gap-3"
        style={{ flex: '1 1 0', minHeight: 0, display: showChat ? 'flex' : 'none' }}>
        {messages.length === 0 && <p className="text-white/25 text-xs text-center mt-10">Conversation will appear here...</p>}
        {messages.map((msg, idx) => (
          <div key={idx} className="flex flex-col gap-1">
            <span className={`text-[10px] px-1 ${msg.role === 'user' ? 'text-blue-300/60 text-right' : 'text-white/30'}`}>
              {msg.role === 'user' ? 'You' : 'Ms. Maria'}
            </span>
            <div className={`w-full px-3 py-2.5 rounded-xl text-xs leading-relaxed break-words whitespace-pre-wrap ${
              msg.role === 'user' ? 'bg-blue-600/80 text-white' : 'bg-white/8 text-white/85 border border-white/10'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10 shrink-0 flex flex-col gap-2">
        {inputMode === 'mic' ? (
          <div className="flex gap-2 items-center">
            <button onClick={() => setMicEnabled(v => !v)}
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                micEnabled && isListening ? 'bg-orange-500/30 border-orange-400/60 animate-pulse' :
                micEnabled ? 'bg-green-500/20 border-green-400/40' : 'bg-white/5 border-white/15'
              }`}>
              {micEnabled ? <Mic className={`w-4 h-4 ${isListening ? 'text-orange-300' : 'text-green-400'}`} /> : <MicOff className="w-4 h-4 text-white/30" />}
            </button>
            <div className={`flex-1 py-2 rounded-full text-xs font-medium text-center border transition-all ${
              isSpeaking ? 'border-blue-400/60 bg-blue-500/15 text-blue-300' :
              isListening ? 'border-orange-400/60 bg-orange-500/15 text-orange-300' :
              micEnabled ? 'border-green-400/30 bg-green-500/10 text-green-300/70' :
              'border-white/15 bg-white/5 text-white/30'
            }`}>
              {isSpeaking ? '🔊 Speaking...' : isListening ? '🎤 Listening...' : micEnabled ? '🎙️ Mic on' : '🔇 Mic off'}
            </div>
            {isSpeaking && (
              <button onClick={stopSpeaking} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-red-500/20 border border-red-400/50 hover:bg-red-500/40">
                <Square className="w-4 h-4 text-red-400 fill-red-400" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <input type="text" value={manualInput} onChange={e => setManualInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendManual()} placeholder="Type in English..."
              className="flex-1 bg-white/10 border border-white/15 rounded-full px-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-blue-400 min-w-0" />
            <button onClick={handleSendManual} className="w-7 h-7 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center shrink-0">
              <Send className="w-3 h-3 text-white" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex w-full h-screen overflow-hidden bg-black">

      {/* Mobile overlay panel — does NOT cover robot, slides over */}
      {isMobile && showPanel && (
        <div className="absolute inset-0 z-30 flex">
          <ChatPanel />
          <div className="flex-1 bg-black/60" onClick={() => setShowPanel(false)} />
        </div>
      )}

      {/* Desktop side panel */}
      {!isMobile && <ChatPanel />}

      {/* Drag handle — desktop only */}
      {!isMobile && (
        <div onMouseDown={handleDragStart}
          className="w-1 h-full bg-white/10 hover:bg-blue-400/60 cursor-col-resize transition-colors shrink-0 z-20" />
      )}

      {/* Teacher area — always visible, full size */}
      <div className="relative flex-1 h-full">
        <img src="/teacher.png" alt="Ms. Maria"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: '50% 10%' }} />

        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

        {/* Mobile: button to open panel */}
        {isMobile && !showPanel && (
          <button onClick={() => setShowPanel(true)}
            className="absolute top-4 left-4 z-20 w-10 h-10 bg-black/60 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center">
            <Menu className="w-5 h-5 text-white" />
          </button>
        )}

        {/* Mobile: floating mic & stop controls */}
        {isMobile && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
            <button onClick={() => setMicEnabled(v => !v)}
              className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                micEnabled && isListening ? 'bg-orange-500/40 border-orange-400 animate-pulse' :
                micEnabled ? 'bg-green-500/20 border-green-400/60' : 'bg-black/60 border-white/20'
              }`}>
              {micEnabled ? <Mic className={`w-5 h-5 ${isListening ? 'text-orange-300' : 'text-green-400'}`} /> : <MicOff className="w-5 h-5 text-white/40" />}
            </button>
            {isSpeaking && (
              <button onClick={stopSpeaking} className="w-12 h-12 rounded-full bg-red-500/30 border-2 border-red-400/60 flex items-center justify-center">
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
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="gsk_..."
                className="flex-1 bg-gray-800 border border-gray-600 rounded-full px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none min-w-0" />
              <button onClick={handleSaveApiKey} className="bg-blue-600 text-white rounded-full px-3 py-1.5 text-xs font-bold shrink-0">Save</button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Free key: <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-blue-400">console.groq.com</a></p>
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
          <button onClick={() => setShowMenu(false)} className="w-full py-1.5 rounded-full text-xs bg-gray-800 text-gray-400">Close</button>
        </div>
      )}
    </div>
  );
}
