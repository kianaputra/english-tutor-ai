import React, { useEffect, useState, useRef } from 'react';
import { Menu, Send, X, Download, MessageSquare, MessageSquareOff, Mic, MicOff, StopCircle } from 'lucide-react';

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
  const [showChat, setShowChat] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const micEnabledRef = useRef(true);
  const [currentMode, setCurrentMode] = useState('conversation');
  const [currentLevel, setCurrentLevel] = useState('intermediate');
  const [inputMode, setInputMode] = useState<'mic' | 'chat'>('mic');
  const [micPaused, setMicPaused] = useState(false);
  const micPausedRef = useRef(false);
  const [manualInput, setManualInput] = useState('');
  const [panelWidth, setPanelWidth] = useState(288);
  const isDraggingRef = useRef(false);

  const chatAreaRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    const startX = e.clientX;
    const startWidth = panelWidth;
    const onMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newWidth = Math.min(600, Math.max(180, startWidth + ev.clientX - startX));
      setPanelWidth(newWidth);
    };
    const onUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  const recognitionRef = useRef<any>(null);

  // Single source of truth via refs
  const isSpeakingRef = useRef(false);
  const isListeningRef = useRef(false);
  const isThinkingRef = useRef(false);  // prevent double-submit
  const inputModeRef = useRef<'mic' | 'chat'>('mic');
  const apiKeyRef = useRef(apiKey);
  const messagesRef = useRef<Message[]>([]);
  const currentModeRef = useRef('conversation');
  const currentLevelRef = useRef('intermediate');

  useEffect(() => { inputModeRef.current = inputMode; }, [inputMode]);
  useEffect(() => { micEnabledRef.current = micEnabled; if (!micEnabled) { try { recognitionRef.current?.abort(); } catch(_){} isActiveRef.current = false; setIsListening(false); } else { setTimeout(tryStartMic, 300); } }, [micEnabled]);
  useEffect(() => { apiKeyRef.current = apiKey; }, [apiKey]);
  useEffect(() => { currentModeRef.current = currentMode; }, [currentMode]);
  useEffect(() => { currentLevelRef.current = currentLevel; }, [currentLevel]);

  // Only start mic when truly idle
  const tryStartMic = () => {
    if (inputModeRef.current !== 'mic') return;
    if (isSpeakingRef.current) return;
    if (isListeningRef.current) return;
    if (isThinkingRef.current) return;
    if (micPausedRef.current) return;    // user paused mic
    try { recognitionRef.current?.start(); } catch (_) {}
  };

  const toggleMic = () => {
    const nowPaused = !micPausedRef.current;
    micPausedRef.current = nowPaused;
    setMicPaused(nowPaused);
    if (nowPaused) {
      // Pause: stop recognition immediately
      try { recognitionRef.current?.abort(); } catch (_) {}
      isListeningRef.current = false;
      setIsListening(false);
    } else {
      // Resume: start listening
      setTimeout(tryStartMic, 300);
    }
  };

  const stopAI = () => {
    window.speechSynthesis.cancel();
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    setStatus('ready');
    // Resume mic after stopping AI
    setTimeout(tryStartMic, 400);
  };

  // Setup recognition ONCE
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.lang = 'en-US';
    rec.continuous = true;       // keep listening, don't auto-stop
    rec.interimResults = true;   // get partial results so we know user is still talking

    let silenceTimer: ReturnType<typeof setTimeout> | null = null;
    let accumulatedText = '';

    const clearSilenceTimer = () => {
      if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
    };

    const submitText = () => {
      clearSilenceTimer();
      const text = accumulatedText.trim();
      accumulatedText = '';
      if (text && !isThinkingRef.current && !isSpeakingRef.current) {
        rec.stop();
        processUserInputRef.current(text);
      }
    };

    rec.onstart = () => {
      isListeningRef.current = true;
      accumulatedText = '';
      setIsListening(true);
      setStatus('listening');
    };

    rec.onresult = (e: any) => {
      if (isSpeakingRef.current) return;

      let interim = '';
      let final = '';

      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          final += e.results[i][0].transcript;
        } else {
          interim += e.results[i][0].transcript;
        }
      }

      if (final) accumulatedText += ' ' + final;

      // Reset silence timer every time user speaks (interim or final)
      if (interim || final) {
        clearSilenceTimer();
        // Wait 1.5s of silence after last word before submitting
        silenceTimer = setTimeout(submitText, 1500);
      }
    };

    rec.onerror = (e: any) => {
      clearSilenceTimer();
      isListeningRef.current = false;
      setIsListening(false);
      if (e.error === 'no-speech') {
        setTimeout(tryStartMic, 300);
      } else {
        setStatus('ready');
        setTimeout(tryStartMic, 1000);
      }
    };

    rec.onend = () => {
      clearSilenceTimer();
      // If we have accumulated text, submit it
      if (accumulatedText.trim() && !isThinkingRef.current && !isSpeakingRef.current) {
        processUserInputRef.current(accumulatedText.trim());
        accumulatedText = '';
      }
      isListeningRef.current = false;
      setIsListening(false);
      setTimeout(tryStartMic, 500);
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
    setMessages(prev => {
      const next = [...prev, { role, content }];
      messagesRef.current = next;
      return next;
    });
    setTimeout(() => {
      if (chatAreaRef.current) chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }, 50);
  };

  const speakNatural = (text: string) => {
    if (!text.trim()) return;

    // Stop mic BEFORE speaking so AI voice won't trigger recognition
    try { recognitionRef.current?.abort(); } catch (_) {}
    isListeningRef.current = false;
    setIsListening(false);

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

    utt.onend = () => {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      setStatus('ready');
      // Wait a moment after AI stops, then listen for user
      setTimeout(tryStartMic, 800);
    };
    utt.onerror = () => {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      setStatus('ready');
      setTimeout(tryStartMic, 800);
    };

    window.speechSynthesis.speak(utt);
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
          ...messagesRef.current.slice(-8).map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
          { role: 'user', content: userText },
        ],
        max_tokens: 200,  // keep responses short
        temperature: 0.68,
      }),
    });

    if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'API error'); }
    return (await res.json()).choices[0].message.content;
  };

  const processUserInput = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (isThinkingRef.current) return;  // already processing
    if (isSpeakingRef.current) return;  // AI is speaking, ignore

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
      setTimeout(tryStartMic, 800);
    } finally {
      isThinkingRef.current = false;
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


  const downloadDocx = () => {
    if (messages.length === 0) return;

    // Build plain text content
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    let text = `English Tutoring Session with Ms. Maria\n`;
    text += `Date: ${dateStr} ${timeStr}\n`;
    text += `Mode: ${currentMode.charAt(0).toUpperCase() + currentMode.slice(1)} | Level: ${currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1)}\n`;
    text += `${'='.repeat(50)}\n\n`;

    messages.forEach((msg) => {
      const speaker = msg.role === 'user' ? 'You' : 'Ms. Maria';
      text += `[${speaker}]\n${msg.content}\n\n`;
    });

    // Download as .txt (universally compatible, opens in Word)
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ms-Maria-Session-${now.toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };


  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    setStatus('ready');
    setTimeout(tryStartMic, 600);
  };

  return (
    <div className="flex w-full h-screen overflow-hidden bg-black">

      {/* LEFT: Chat panel */}
      <div className="relative z-10 flex flex-col h-full shrink-0 bg-black/80 backdrop-blur-md" style={{ width: panelWidth }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              status === 'ready'     ? 'bg-emerald-400' :
              status === 'listening' ? 'bg-orange-400 animate-pulse' :
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
          <div className="flex items-center gap-1.5">
            <button
              onClick={downloadDocx}
              disabled={messages.length === 0}
              title="Download conversation"
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-green-500/40 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shrink-0 transition-colors">
              <Download className="w-3.5 h-3.5 text-white" />
            </button>
            <button
              onClick={() => setShowChat(!showChat)}
              title={showChat ? 'Hide conversation' : 'Show conversation'}
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${showChat ? 'bg-blue-500/40 hover:bg-blue-500/60' : 'bg-white/10 hover:bg-white/20'}`}>
              {showChat
                ? <MessageSquare className="w-3.5 h-3.5 text-blue-300" />
                : <MessageSquareOff className="w-3.5 h-3.5 text-white/50" />}
            </button>
            <button onClick={() => setShowMenu(!showMenu)}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0">
              {showMenu ? <X className="w-3.5 h-3.5 text-white" /> : <Menu className="w-3.5 h-3.5 text-white" />}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={chatAreaRef}
          className="overflow-y-auto p-3 flex flex-col gap-3"
          style={{ flex: '1 1 0', minHeight: 0, overflowY: 'auto', display: showChat ? 'flex' : 'none' }}
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

        {/* Input */}
        <div className="p-3 border-t border-white/10 shrink-0 flex flex-col gap-2">

          {/* Stop AI button — only shown when AI is speaking */}
          {isSpeaking && (
            <button
              onClick={stopAI}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-full text-xs font-medium bg-red-500/20 border border-red-400/50 text-red-300 hover:bg-red-500/30 transition-colors animate-pulse"
            >
              <Square className="w-3 h-3 fill-current" />
              Stop Ms. Maria
            </button>
          )}

          {inputMode === 'mic' ? (
            <div className="flex items-center gap-2">
              {/* Mic toggle button */}
              <button
                onClick={toggleMic}
                disabled={isSpeaking}
                title={micPaused ? 'Resume microphone' : 'Pause microphone'}
                className={`w-10 h-8 rounded-full flex items-center justify-center shrink-0 transition-all border ${
                  isSpeaking
                    ? 'opacity-30 cursor-not-allowed border-white/10 bg-white/5'
                    : micPaused
                      ? 'bg-red-500/20 border-red-400/50 hover:bg-red-500/30'
                      : 'bg-emerald-500/20 border-emerald-400/50 hover:bg-emerald-500/30'
                }`}
              >
                {micPaused
                  ? <MicOff className="w-3.5 h-3.5 text-red-300" />
                  : <Mic className="w-3.5 h-3.5 text-emerald-300" />
                }
              </button>

              {/* Status indicator */}
              <div className={`flex-1 py-2 rounded-full text-xs font-medium text-center border transition-all ${
                isListening ? 'border-orange-400/60 bg-orange-500/15 text-orange-300' :
                isSpeaking  ? 'border-blue-400/60 bg-blue-500/15 text-blue-300' :
                micPaused   ? 'border-red-400/30 bg-red-500/10 text-red-300/60' :
                              'border-white/15 bg-white/5 text-white/40'
              }`}>
                {isSpeaking ? '🔊 Speaking...' :
                 isListening ? '🎤 Listening...' :
                 micPaused ? '⏸ Mic paused' :
                 '🎙️ Mic on'}
              </div>
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

      {/* Drag handle */}
      <div
        onMouseDown={handleDragStart}
        className="w-1 h-full bg-white/10 hover:bg-blue-400/60 cursor-col-resize transition-colors shrink-0 z-20"
        title="Drag to resize"
      />

      {/* RIGHT: Teacher image */}
      <div className="relative flex-1 h-full">
        <img src="/teacher.png" alt="Ms. Maria"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: '50% 10%' }}
        />
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md rounded-full px-5 py-1.5 border border-white/10">
          <span className="text-sm font-medium text-white">Ms. Maria · English Tutor AI</span>
        </div>
      </div>

      {/* MENU */}
      {showMenu && (
        <div className="absolute top-14 left-4 z-50 w-64 bg-gray-950/97 backdrop-blur-xl rounded-2xl border border-white/10 p-4 shadow-2xl flex flex-col gap-3">
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
        </div>
      )}
    </div>
  );
}
