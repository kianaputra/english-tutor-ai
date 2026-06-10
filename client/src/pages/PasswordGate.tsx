import React, { useState } from 'react';

interface PasswordGateProps {
  onUnlock: () => void;
}

export default function PasswordGate({ onUnlock }: PasswordGateProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  // Ganti PASSWORD_KAMU dengan password yang kamu inginkan
  const CORRECT_PASSWORD = '4m4r1sh4s14n';

  const handleSubmit = () => {
    if (input.trim().toUpperCase() === CORRECT_PASSWORD) {
      localStorage.setItem('msmaria_unlocked', 'true');
      onUnlock();
    } else {
      setError(true);
      setShake(true);
      setInput('');
      setTimeout(() => setShake(false), 600);
      setTimeout(() => setError(false), 3000);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black flex">

      {/* Background image */}
      <img
        src="/teacher.png"
        alt="Ms. Maria"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: '50% 10%', filter: 'brightness(0.4)' }}
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />

      {/* Content */}
      <div className="relative z-10 w-full flex flex-col items-center justify-center px-6">

        {/* Logo/Name */}
        <div className="mb-8 text-center">
          <div className="w-20 h-20 rounded-full border-2 border-white/30 overflow-hidden mx-auto mb-4">
            <img src="/teacher.png" alt="Ms. Maria"
              className="w-full h-full object-cover"
              style={{ objectPosition: '50% 15%' }} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-wide">Ms. Maria</h1>
          <p className="text-white/60 text-sm mt-1">AI English Tutor</p>
        </div>

        {/* Card */}
        <div
          className="w-full max-w-sm bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl"
          style={{
            animation: shake ? 'shake 0.5s ease' : 'none',
          }}
        >
          <h2 className="text-white font-semibold text-center mb-1">Enter Access Password</h2>
          <p className="text-white/40 text-xs text-center mb-5">
            Password provided after purchase
          </p>

          <input
            type="password"
            value={input}
            onChange={e => { setInput(e.target.value); setError(false); }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="••••••••••"
            autoFocus
            className={`w-full bg-white/10 border rounded-xl px-4 py-3 text-white text-center text-lg tracking-widest placeholder-white/20 outline-none transition-colors ${
              error ? 'border-red-400/80' : 'border-white/20 focus:border-blue-400'
            }`}
          />

          {error && (
            <p className="text-red-400 text-xs text-center mt-2">
              ❌ Wrong password. Please try again.
            </p>
          )}

          <button
            onClick={handleSubmit}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Unlock Access
          </button>

          <p className="text-white/30 text-xs text-center mt-4">
            Don't have access yet?{' '}
            <a
              href="https://lynk.id/amarishasian"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Buy here
            </a>
          </p>
        </div>

        {/* Footer */}
        <p className="text-white/20 text-xs mt-6">© 2025 Ms. Maria AI English Tutor</p>
      </div>

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-4px); }
          90% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
