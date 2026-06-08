# Ms. Maria - AI English Tutor Implementation Notes

## Project Overview
Membuat AI Chatbot Guru Bahasa Inggris yang realistis dengan:
1. **Monitor Display**: Tampilan guru di monitor (horizontal/vertikal)
2. **Face Detection**: Deteksi wajah dalam jarak ~2 meter menggunakan MediaPipe
3. **Lip-Sync Animation**: Animasi mulut yang bergerak saat berbicara

## Architecture

### Frontend Stack
- **React 19** + **TypeScript**
- **Tailwind CSS 4** untuk styling
- **MediaPipe Face Detector** untuk deteksi wajah
- **Web Speech API** untuk TTS (Text-to-Speech)
- **Groq API** untuk AI responses

### Key Libraries
- `@mediapipe/tasks-vision` - Face detection
- `web-speech-api` - Native browser speech synthesis
- `axios` - API calls

### Core Features

#### 1. Face Detection (MediaPipe)
- Mendeteksi kehadiran wajah dalam frame kamera
- Trigger greeting ketika wajah terdeteksi dalam jarak ~2 meter
- Cooldown 35 detik sebelum greeting berikutnya

#### 2. Lip-Sync Animation
- Phoneme-based: Animasi mulut berdasarkan phoneme dari teks
- Fallback: Animasi mulut sederhana yang bergerak dengan ritme suara
- Menggunakan SVG atau div-based mouth animation

#### 3. Monitor Display
- Fullscreen image of teacher
- Animated mouth overlay
- Chat bubbles
- Status badge
- Microphone input bar

## File Structure
```
client/src/
  pages/
    TutorPage.tsx          - Main tutor interface
  components/
    TutorDisplay.tsx       - Teacher image + mouth animation
    ChatArea.tsx           - Chat bubbles
    FaceDetector.tsx       - MediaPipe face detection
    MouthAnimation.tsx     - Lip-sync animation
    StatusBadge.tsx        - Status indicator
    MicrophoneBar.tsx      - Microphone input
  hooks/
    useFaceDetection.ts    - Face detection hook
    useLipSync.ts          - Lip-sync animation hook
    useGroqAI.ts           - Groq API integration
  lib/
    phonemes.ts            - Phoneme mapping
    faceDetectionUtils.ts  - Face detection utilities
```

## Implementation Steps

### Phase 1: Setup MediaPipe & Face Detection
- [ ] Install @mediapipe/tasks-vision
- [ ] Create useFaceDetection hook
- [ ] Implement camera access & face detection logic
- [ ] Add distance estimation (2 meter threshold)

### Phase 2: Lip-Sync Animation
- [ ] Create phoneme mapping (English phonemes)
- [ ] Implement mouth animation component
- [ ] Create useLipSync hook
- [ ] Integrate with Web Speech API

### Phase 3: UI Components
- [ ] TutorDisplay component
- [ ] ChatArea component
- [ ] StatusBadge component
- [ ] MicrophoneBar component

### Phase 4: Integration
- [ ] Connect face detection to greeting trigger
- [ ] Connect lip-sync to speech synthesis
- [ ] Connect Groq API for AI responses
- [ ] Add menu & settings

### Phase 5: Polish & Testing
- [ ] Responsive design (horizontal/vertical)
- [ ] Performance optimization
- [ ] Error handling
- [ ] Testing

## Technical Challenges & Solutions

### Challenge 1: Distance Estimation
**Problem**: Estimating 2-meter distance from face size
**Solution**: Use face bounding box size as proxy. Calibrate with known distances.

### Challenge 2: Accurate Lip-Sync
**Problem**: Phoneme-based lip-sync requires precise timing
**Solution**: 
- Use Web Speech API's `onboundary` event for phoneme timing
- Fallback to amplitude-based animation if phoneme data unavailable

### Challenge 3: Real-time Performance
**Problem**: MediaPipe + animation + speech synthesis = heavy load
**Solution**:
- Run face detection at 10 FPS (not 30 FPS)
- Debounce face detection events
- Use requestAnimationFrame for smooth animation

## API Integration

### Groq API
- Endpoint: `https://api.groq.com/openai/v1/chat/completions`
- Model: `llama-3.3-70b-versatile`
- System prompts: Conversation, Grammar, Vocabulary, Role Play

### MediaPipe
- CDN: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision`
- Model: Face Detector (BlazeFace)

## Design Decisions

1. **MediaPipe over face-api.js**: 
   - Lebih cepat dan akurat
   - Lebih ringan (smaller bundle)
   - Maintained oleh Google

2. **Web Speech API for TTS**:
   - Native browser support
   - Tidak perlu API key eksternal
   - Fallback ke Groq API jika diperlukan

3. **Phoneme-based Lip-Sync**:
   - Lebih realistis daripada amplitude-based
   - Requires phoneme data extraction

## Next Steps
- Tunggu foto guru dari user
- Implementasi komponen React
- Testing & optimization
