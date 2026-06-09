import React, { useEffect, useState, useRef } from 'react';
import { useMediaPipeFaceDetection, FaceBlendshapes, FaceLandmarks } from '@/hooks/useMediaPipeFaceDetection';
import { FaceAnimationOverlay, BlendshapesDebug } from '@/components/FaceAnimationOverlay';
import { SimpleMouthAnimation } from '@/components/MouthAnimation';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

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
  const [inputMode, setInputMode] = useState('mic');
  const [manualInput, setManualInput] = useState('');
  const [currentBlendshapes, setCurrentBlendshapes] = useState<FaceBlendshapes | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [mouthOpenness, setMouthOpenness] = useState(0);

  const chatAreaRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const tutorImageRef = useRef<HTMLImageElement>(null);

  // Initialize MediaPipe Face Detection
  const { isInitialized: faceDetectionReady, error: faceError } = useMediaPipeFaceDetection({
    enabled: true,
    onFaceDetected: (landmarks: FaceLandmarks, blendshapes: FaceBlendshapes) => {
      setCurrentBlendshapes(blendshapes);
      // Use mouth openness for lip-sync
      const mouthOpen = Math.max(blendshapes.mouthOpen, blendshapes.jawOpen);
      setMouthOpenness(mouthOpen);
    },
    onFaceClose: () => {
      if (messages.length === 0) {
        triggerGreeting();
      }
    },
    distanceThreshold: 0.15,
  });

  // Initialize speech recognition
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      recognitionRef.current = new SR();
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setStatus('listening');
      };

      recognitionRef.current.onresult = (event: any) => {
        let finalText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalText += event.results[i][0].transcript;
          }
        }
        if (finalText) {
          recognitionRef.current.stop();
          processUserInput(finalText);
        }
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        setStatus('ready');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (inputMode === 'mic' && !isSpeaking) {
          setTimeout(() => startListening(), 600);
        }
      };
    }
  }, [inputMode, isSpeaking]);

  const startListening = () => {
    if (recognitionRef.current && !isSpeaking && !isListening) {
      recognitionRef.current.start();
    }
  };

  const speakNatural = (text: string) => {
    if (!text.trim() || isSpeaking) return;

    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    setStatus('speaking');

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.88;
    utterance.pitch = 1.1;

    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find(v => v.lang.startsWith('en') && v.name.includes('Female')) ||
      voices.find(v => v.lang.startsWith('en'));

    if (preferred) utterance.voice = preferred;

    utterance.onend = () => {
      setIsSpeaking(false);
      setStatus('ready');
      if (inputMode === 'mic') {
        setTimeout(() => startListening(), 300);
      }
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setStatus('ready');
    };

    if (tutorImageRef.current) {
      tutorImageRef.current.classList.add('talking');
    }

    window.speechSynthesis.speak(utterance);
  };

  const callGroqAI = async (userText: string): Promise<string> => {
    if (!apiKey || !apiKey.startsWith('gsk_')) {
      throw new Error('Valid Groq API key required');
    }

    const systemPrompts: Record<string, string> = {
      conversation: `You are Ms. Maria, a kind and professional English tutor. Student level: ${currentLevel}. Respond in natural English, 2-3 sentences. If there are grammar mistakes, correct them gently inline with "(correction: ...)". Use only English, no Indonesian. Keep friendly and encouraging.`,
      grammar: `You are Ms. Maria, grammar expert. Level: ${currentLevel}. Analyze ALL grammar mistakes. Format: **Corrected:** [full corrected sentence] **Mistakes:** - [explanation in English] **Grammar Tip:** [short rule in English] English only. No Indonesian.`,
      vocabulary: `You are Ms. Maria. Teach 3-5 words with: • Word (pronunciation hint): meaning + example sentence. All in English. No Indonesian.`,
      roleplay: `You are Ms. Maria, roleplay partner. Level: ${currentLevel}. Stay in character, natural English dialogue. End with 💡 Tip: [helpful phrase]. English only.`,
    };

    const sys = systemPrompts[currentMode] || systemPrompts.conversation;
    const msgs = [
      { role: 'system', content: sys },
      ...messages.slice(-8).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
      { role: 'user', content: userText },
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: msgs,
        max_tokens: 550,
        temperature: 0.68,
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'API error');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  };

  const processUserInput = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (!apiKey) {
      addMessage('bot', "Please add your Groq API key first. Tap the menu button and paste your key.");
      speakNatural("Please add your Groq API key first.");
      return;
    }

    addMessage('user', trimmed);
    setStatus('thinking');

    try {
      const aiReply = await callGroqAI(trimmed);
      addMessage('bot', aiReply);
      speakNatural(aiReply);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      addMessage('bot', `⚠️ Error: ${errorMsg}`);
      speakNatural('Sorry, there was an error. Please check your API key.');
      setStatus('ready');
    }
  };

  const addMessage = (role: 'user' | 'bot', content: string) => {
    setMessages(prev => [...prev, { role, content }]);
    setTimeout(() => {
      if (chatAreaRef.current) {
        chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
      }
    }, 0);
  };

  const triggerGreeting = () => {
    if (!apiKey) {
      addMessage('bot', "Hello! I'm Ms. Maria. Please set your Groq API key to get started.");
      speakNatural("Hello! I'm Ms. Maria. Please set your Groq API key to get started.");
      return;
    }

    const greetings = [
      "Oh, hi there! I'm glad to see you. Ready to improve your English today?",
      "Welcome! Let's have a natural English conversation. What would you like to talk about?",
      "Hello! I'm Ms. Maria. I'll help you speak English naturally. How are you doing?",
    ];

    const msg = greetings[Math.floor(Math.random() * greetings.length)];
    addMessage('bot', msg);
    speakNatural(msg);
  };

  const handleSaveApiKey = () => {
    if (apiKey.startsWith('gsk_')) {
      localStorage.setItem('eng_tutor_groq', apiKey);
      addMessage('bot', "✅ API key saved! I'm ready to help you practice English.");
      speakNatural("API key saved successfully.");
      setShowMenu(false);
    } else {
      alert('Please enter a valid Groq API key starting with gsk_');
    }
  };

  const handleSendManual = () => {
    if (manualInput.trim()) {
      processUserInput(manualInput);
      setManualInput('');
    }
  };

  return (
    <div className="relative w-full h-screen bg-gray-700 overflow-hidden">
      {/* Tutor Image Background */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center">
        <img
          ref={tutorImageRef}
          src="/teacher.png"
          alt="Ms. Maria"
          className="w-full h-full object-cover object-center transition-all duration-150"
          style={{
            filter: isSpeaking ? 'drop-shadow(0 0 22px rgba(200, 220, 255, 0.45)) brightness(1.02)' : 'none',
          }}
        />
      </div>

      {/* MediaPipe Face Animation Overlay */}
      {currentBlendshapes && (
        <FaceAnimationOverlay
          blendshapes={currentBlendshapes}
          isActive={isSpeaking}
        />
      )}

      {/* Animated Mouth Overlay - uses MediaPipe mouth openness */}
      {isSpeaking && (
        <div className="absolute bottom-2/5 left-1/2 transform -translate-x-1/2 z-20">
          <SimpleMouthAnimation
            shape={{
              openness: mouthOpenness,
              roundness: 0.3,
              width: 0.7,
            }}
            isActive={isSpeaking}
          />
        </div>
      )}

      {/* Status Badge */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20 bg-black/55 backdrop-blur-md rounded-full px-5 py-2 border border-yellow-200/30 flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full transition-all ${
            status === 'ready'
              ? 'bg-green-500 shadow-lg shadow-green-500'
              : status === 'listening'
                ? 'bg-orange-500 shadow-lg shadow-orange-500 animate-pulse'
                : status === 'thinking'
                  ? 'bg-yellow-500 shadow-lg shadow-yellow-500 animate-pulse'
                  : 'bg-blue-500 shadow-lg shadow-blue-500'
          }`}
        />
        <span className="text-xs font-medium text-yellow-50">
          Ms. Maria · {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
        {faceDetectionReady && (
          <span className="text-xs text-green-300 ml-2">✓ MediaPipe Ready</span>
        )}
      </div>

      {/* Chat Area */}
      <div
        ref={chatAreaRef}
        className="absolute top-20 left-1/2 transform -translate-x-1/2 w-11/12 max-w-md max-h-96 overflow-y-auto z-15 flex flex-col gap-3 p-2"
        style={{
          scrollBehavior: 'smooth',
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-2xl text-sm font-medium ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-black/70 backdrop-blur-sm text-yellow-50 border border-yellow-200/15 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Microphone Bar */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-18 bg-black/60 backdrop-blur-2xl rounded-full px-6 py-2 border border-yellow-200/25 flex items-center gap-4">
        <div className="flex gap-1 items-center">
          {[0, 1, 2, 3].map(i => (
            <span
              key={i}
              className={`w-1 rounded-sm transition-all ${
                isSpeaking
                  ? 'bg-blue-500 h-4'
                  : isListening
                    ? 'bg-green-500 h-5'
                    : 'bg-gray-500 h-3'
              }`}
              style={{
                animationDelay: `${i * 0.12}s`,
              }}
            />
          ))}
        </div>
        <span className="text-xs font-medium text-gray-200">
          {isSpeaking ? '🔊 Speaking' : isListening ? '🎤 Listening' : '🎙️ Speak naturally...'}
        </span>
      </div>

      {/* Menu Button */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="absolute bottom-8 right-6 z-30 w-12 h-12 bg-black/65 backdrop-blur-2xl rounded-full border border-yellow-200/40 flex items-center justify-center hover:bg-blue-600/60 transition-all"
      >
        <Menu className="w-6 h-6 text-yellow-50" />
      </button>

      {/* Menu Panel */}
      {showMenu && (
        <div className="absolute bottom-24 right-6 z-35 w-80 max-h-96 bg-gray-900/96 backdrop-blur-3xl rounded-3xl border border-yellow-200/20 p-5 overflow-y-auto shadow-2xl">
          {/* API Key Section */}
          <div className="mb-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">🔑 Groq API Key</label>
            <div className="mt-2 flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="gsk_..."
                className="flex-1 bg-gray-800 border border-gray-600 rounded-full px-3 py-2 text-xs text-white placeholder-gray-500 outline-none"
              />
              <Button
                onClick={handleSaveApiKey}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-2 text-xs font-bold"
              >
                Save
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Get free key at <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-blue-400">console.groq.com</a>
            </p>
          </div>

          {/* Learning Mode */}
          <div className="mb-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">📘 Learning Mode</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {['conversation', 'grammar', 'vocabulary', 'roleplay'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setCurrentMode(mode)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    currentMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Level */}
          <div className="mb-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">🎯 Level</label>
            <div className="mt-2 flex gap-2">
              {['beginner', 'intermediate', 'advanced'].map(level => (
                <button
                  key={level}
                  onClick={() => setCurrentLevel(level)}
                  className={`flex-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                    currentLevel === level
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Input Mode */}
          <div className="mb-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">🎤 Input Mode</label>
            <div className="mt-2 flex gap-2">
              {['mic', 'chat'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setInputMode(mode)}
                  className={`flex-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                    inputMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {mode === 'mic' ? '🎙️ Mic' : '⌨️ Type'}
                </button>
              ))}
            </div>
          </div>

          {/* Debug Toggle */}
          <div className="mb-4">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="w-full px-3 py-2 rounded-full text-xs font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 transition-all"
            >
              {showDebug ? '🔍 Hide Debug' : '🔍 Show Debug'}
            </button>
          </div>

          {/* Type Input Area */}
          {inputMode === 'chat' && (
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSendManual()}
                placeholder="Type English..."
                className="flex-1 bg-gray-800 border border-gray-600 rounded-full px-3 py-2 text-xs text-white placeholder-gray-500 outline-none"
              />
              <Button
                onClick={handleSendManual}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-2 text-xs font-bold"
              >
                Send
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Debug Info */}
      <BlendshapesDebug blendshapes={currentBlendshapes || {} as FaceBlendshapes} visible={showDebug} />

      {/* Error Message */}
      {faceError && (
        <div className="absolute top-20 left-4 z-40 bg-red-600/90 text-white text-xs p-3 rounded-lg max-w-xs">
          ⚠️ Camera Error: {faceError}
        </div>
      )}
    </div>
  );
}
