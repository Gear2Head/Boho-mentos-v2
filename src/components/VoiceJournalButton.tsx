import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { motion, AnimatePresence } from 'motion/react';

// Extend Window interface for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function VoiceJournalButton() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  
  const profile = useAppStore(s => s.profile);

  useEffect(() => {
    // Initialize SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'tr-TR'; // Default to Turkish

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(prev => prev + ' ' + currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        stopRecording();
      };

      recognition.onend = () => {
        // If it stops automatically but we still think we are recording, restart it.
        // But for Voice Journaling, one session is enough.
        if (isRecording) {
            // we let the user stop it manually to trigger processing
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const startRecording = () => {
    if (!recognitionRef.current) {
      alert("Tarayıcın sesli dikte özelliğini desteklemiyor. (Sadece Chrome/Edge)");
      return;
    }
    setTranscript('');
    setIsRecording(true);
    recognitionRef.current.start();
  };

  const stopRecording = async () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsRecording(false);
    
    if (transcript.trim().length > 10) {
      await processVoiceLog(transcript);
    } else {
      setTranscript('');
    }
  };

  const processVoiceLog = async (text: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'parseVoiceLog',
          transcript: text,
        }),
      });

      if (!response.ok) throw new Error('AI Server Error');
      
      const result = await response.json();
      if (result.data && result.data.subject) {
        // Log the session via AppStore
        useAppStore.getState().addLog({
          id: Date.now().toString(),
          date: new Date().toISOString(),
          subject: result.data.subject,
          topic: result.data.topic || 'Genel',
          durationMinutes: result.data.avgTime || 30,
          questionCount: result.data.questions || 10,
          correctCount: result.data.correct || 0,
          wrongCount: result.data.wrong || 0,
          emptyCount: result.data.empty || 0,
          notes: `Sesli Kayıt: "${text.substring(0, 50)}..."\nAI Önerisi: ${result.data.coachAdvice || ''}`,
          difficulty: 'medium',
          type: 'study',
        });
      } else {
         alert("Ses analizi başarısız oldu. Anlaşılır konuşmayı dene.");
      }
    } catch (err) {
      console.error(err);
      alert("Yapay zeka sesini işleyemedi.");
    } finally {
      setIsProcessing(false);
      setTranscript('');
    }
  };

  if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
    return null; // Don't render if not supported
  }

  return (
    <div className="relative w-full">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        className={`w-full flex items-center justify-center gap-2 p-3 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm
          ${isRecording ? 'bg-rose-500/10 border-rose-500/50 text-rose-500 animate-pulse' : 
            isProcessing ? 'bg-accent/10 border-accent/50 text-accent opacity-70' : 
            'bg-surface border-app text-ink-muted hover:border-accent/40 hover:text-accent'}`}
      >
        {isProcessing ? (
          <><Loader2 size={14} className="animate-spin" /> İŞLENİYOR...</>
        ) : isRecording ? (
          <><MicOff size={14} /> KAYDI BİTİR</>
        ) : (
          <><Mic size={14} /> SESLİ KAYIT</>
        )}
      </button>

      {/* Recording popup/status */}
      <AnimatePresence>
        {isRecording && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-full mb-3 left-0 right-0 p-4 bg-zinc-900 border border-rose-500/30 shadow-2xl shadow-rose-500/10 rounded-2xl z-50 pointer-events-none"
          >
            <div className="flex items-center gap-2 mb-2">
               <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
               <span className="text-[10px] uppercase font-black tracking-widest text-rose-500">Dinliyor...</span>
            </div>
            <p className="text-xs text-zinc-300 italic line-clamp-3">
              "{transcript || 'Konuşmaya başla...'}"
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
