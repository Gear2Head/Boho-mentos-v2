/**
 * AMAÇ: Web Speech API kullanarak AI Koç mesajlarını sese dönüştürmek.
 * MANTIK: "Hardcore" modu için agresif/hızlı okuma profili; standart için normal.
 */

let synth: SpeechSynthesis | null = null;
let voiceHardcore: SpeechSynthesisVoice | null = null;
let voiceStandard: SpeechSynthesisVoice | null = null;

function initVoices() {
  if (typeof window === 'undefined') return;
  synth = window.speechSynthesis;
  
  if (!synth) return;

  const setVoices = () => {
    const voices = synth!.getVoices();
    // Try to find a Turkish voice
    const trVoices = voices.filter(v => v.lang.startsWith('tr'));
    
    if (trVoices.length > 0) {
      // Use standard Turkish voice
      voiceStandard = trVoices[0];
      // If there are multiple, maybe pick a different one for hardcore, else use same but alter pitch/rate
      voiceHardcore = trVoices.length > 1 ? trVoices[1] : trVoices[0];
    } else {
      // Fallback to English or default
      voiceStandard = voices[0];
      voiceHardcore = voices[0];
    }
  };

  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = setVoices;
  }
  setVoices();
}

// Sadece tarayıcıda çalışması için
if (typeof window !== 'undefined') {
  setTimeout(initVoices, 100);
}

export const SpeechEngine = {
  speak(text: string, isHardcore: boolean = false) {
    if (!synth) return;
    
    // Stop any ongoing speech
    synth.cancel();

    // Markdown etiketlerini ve özel komutları temizle (örneğin JSON blokları)
    const cleanText = text
      .replace(/```[\s\S]*?```/g, '') // Kod bloklarını sil
      .replace(/\[\[.*?\]\]/g, '')    // Özel etiketleri sil
      .replace(/[*_~#]/g, '');        // Markdown sembollerini sil

    if (!cleanText.trim()) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'tr-TR';
    
    if (isHardcore) {
      utterance.voice = voiceHardcore;
      utterance.pitch = 0.8; // Daha kalın, agresif ses
      utterance.rate = 1.25; // Daha hızlı, sabırsız okuma
      utterance.volume = 1.0;
    } else {
      utterance.voice = voiceStandard;
      utterance.pitch = 1.0;
      utterance.rate = 1.05;
      utterance.volume = 0.8;
    }

    synth.speak(utterance);
  },

  stop() {
    if (synth) {
      synth.cancel();
    }
  }
};
