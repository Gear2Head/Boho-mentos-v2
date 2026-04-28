/**
 * AMAÇ: Tarayıcı Web Audio API kullanarak dışa bağımlılıksız UI ses efektleri üretmek.
 * MANTIK: mp3/wav dosyalarına ihtiyaç duymadan, osilatörler ile prosedürel sesler oluşturur.
 */

let audioCtx: AudioContext | null = null;

function getContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Tek nota yardımcısı — shared by all sounds
function _playNote(ctx: AudioContext, freq: number, startTime: number, duration: number, type: OscillatorType = 'triangle', volume = 0.25) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

function _haptic(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

export const AudioEngine = {
  // Standart mesaj gönderme sesi (Swoosh/Pop)
  playSend() {
    const ctx = getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  },

  // Standart mesaj alma sesi (Pop)
  playReceive() {
    const ctx = getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  },

  // Görev tamamlama (Başarı / Ding) - 3 nota arpeji
  playSuccess() {
    const ctx = getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    _playNote(ctx, 440, now, 0.2);            // A4
    _playNote(ctx, 554.37, now + 0.1, 0.4);   // C#5
    _playNote(ctx, 659.25, now + 0.22, 0.5);  // E5
    _haptic([50, 50, 100]);
  },

  // Toxic / Hardcore mesaj sesi (Karanlık distorsiyon)
  playToxicAlert() {
    const ctx = getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(50, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.3);
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(52, ctx.currentTime);
    osc2.frequency.linearRampToValueAtTime(42, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc2.start();
    osc.stop(ctx.currentTime + 0.4);
    osc2.stop(ctx.currentTime + 0.4);
    _haptic([100, 50, 100, 50, 200]);
  },

  // ✅ Quiz doğru cevap sesi (Cheerful ping)
  playCorrect() {
    const ctx = getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    _playNote(ctx, 523.25, now, 0.15, 'sine', 0.2);
    _playNote(ctx, 783.99, now + 0.1, 0.25, 'sine', 0.18);
    _haptic(30);
  },

  // ❌ Quiz yanlış cevap sesi (Low buzz)
  playWrong() {
    const ctx = getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    _playNote(ctx, 200, now, 0.1, 'square', 0.15);
    _playNote(ctx, 180, now + 0.12, 0.2, 'square', 0.1);
    _haptic([80, 40, 80]);
  },

  // ⏱️ Pomodoro / Timer tamamlandı (Ding x3)
  playTimerDone() {
    const ctx = getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [0, 0.35, 0.7].forEach(delay => {
      _playNote(ctx, 880, now + delay, 0.3, 'triangle', 0.3);
    });
    _haptic([200, 100, 200, 100, 200]);
  },

  // 🔥 Streak kazanıldı (Ascending fanfare)
  playStreakMilestone() {
    const ctx = getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [261.63, 329.63, 392.00, 523.25, 659.25].forEach((freq, i) => {
      _playNote(ctx, freq, now + i * 0.1, 0.35, 'triangle', 0.22);
    });
    _haptic([50, 50, 50, 50, 150]);
  },

  // 💀 Boss yenildi (Epic impact + victory fanfare)
  playBossDefeated() {
    const ctx = getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const boom = ctx.createOscillator();
    const g = ctx.createGain();
    boom.type = 'sawtooth';
    boom.frequency.setValueAtTime(80, now);
    boom.frequency.exponentialRampToValueAtTime(20, now + 0.3);
    g.gain.setValueAtTime(0.4, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    boom.connect(g);
    g.connect(ctx.destination);
    boom.start(now);
    boom.stop(now + 0.3);
    [329.63, 392.00, 523.25, 659.25].forEach((freq, i) => {
      _playNote(ctx, freq, now + 0.35 + i * 0.12, 0.4, 'triangle', 0.28);
    });
    _haptic([300, 100, 100, 100, 300]);
  },

  // 🎯 ELO artışı (Upward sweep)
  playEloUp() {
    const ctx = getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  },

  // 📚 Flashcard flip sesi
  playFlip() {
    const ctx = getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    _playNote(ctx, 350, now, 0.08, 'sine', 0.12);
    _playNote(ctx, 420, now + 0.06, 0.08, 'sine', 0.1);
  },

  // ─── AMBIENCE ENGINE ─────────────────────────────────────────────────────────
  _ambienceSource: null as AudioBufferSourceNode | null,
  _ambienceGain: null as GainNode | null,

  startAmbience(type: 'white' | 'pink' | 'brown', volume = 0.3) {
    const ctx = getContext();
    if (!ctx) return;
    this.stopAmbience();

    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    } else if (type === 'pink') {
      let b0, b1, b2, b3, b4, b5, b6;
      b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        data[i] *= 0.11; // compensation
        b6 = white * 0.115926;
      }
    } else if (type === 'brown') {
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        const out = (lastOut + (0.02 * white)) / 1.02;
        data[i] = out * 3.5;
        lastOut = out;
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1);

    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();

    this._ambienceSource = source;
    this._ambienceGain = gain;
  },

  stopAmbience() {
    if (this._ambienceGain && audioCtx) {
      this._ambienceGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
      const s = this._ambienceSource;
      setTimeout(() => s?.stop(), 600);
    }
    this._ambienceSource = null;
    this._ambienceGain = null;
  },

  setAmbienceVolume(volume: number) {
    if (this._ambienceGain && audioCtx) {
      this._ambienceGain.gain.setTargetAtTime(volume, audioCtx.currentTime, 0.1);
    }
  },

  // ─── TTS ENGINE ──────────────────────────────────────────────────────────────
  _currentUtterance: null as SpeechSynthesisUtterance | null,

  playTts(text: string, onEnd?: () => void) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    this.stopTts();

    // Markdown temizliği (TTS için sadece düz metin)
    const cleanText = text.replace(/[*#_\[\]()]/g, '').replace(/\[\[.*?\]\]/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Ses seçimi (Kadın sesi önceliği)
    const voices = window.speechSynthesis.getVoices();
    const trVoices = voices.filter(v => v.lang.startsWith('tr'));
    
    // "Google Türkçe" veya "Microsoft Emel" gibi kadın seslerini ara
    const femaleVoice = trVoices.find(v => 
      v.name.includes('Google') || 
      v.name.includes('Female') || 
      v.name.includes('Emel') ||
      v.name.includes('Seda')
    );

    utterance.voice = femaleVoice || trVoices[0] || null;
    utterance.pitch = 1.1; // Hafif ince ses (Daha kadınsı/genç tını)
    utterance.rate = 1.0;
    utterance.volume = 1.0;

    utterance.onend = () => {
      this._currentUtterance = null;
      onEnd?.();
    };

    this._currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  },

  stopTts() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this._currentUtterance = null;
    }
  }
};
