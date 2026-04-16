import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '../../services/supabaseClient';
import { CoachIntent } from '../../types/coach';
import { Loader2, Play, Save, CheckCircle } from 'lucide-react';
import { INTENT_INSTRUCTIONS } from '../../services/promptBuilder';

const INTENTS: CoachIntent[] = [
  'daily_plan', 'log_analysis', 'exam_analysis', 'exam_debrief',
  'topic_explain', 'intervention', 'qa_mode', 'free_chat',
  'war_room_analysis', 'weekly_review', 'micro_feedback',
  'inverse_coaching', 'flashcard_generation', 'forgetting_curve_reminder', 'daily_quest'
];

export function PromptLab() {
  const [selectedIntent, setSelectedIntent] = useState<CoachIntent>('qa_mode');
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [testUserMessage, setTestUserMessage] = useState<string>('Merhaba, bugün ne yapsam?');
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [rawResponse, setRawResponse] = useState<string>('');
  const [parsedJson, setParsedJson] = useState<any>(null);

  useEffect(() => {
    // Load current effective prompt combining code defaults and db overrides
    setSystemPrompt(INTENT_INSTRUCTIONS[selectedIntent] || 'No default config for this intent.');
    loadOverride(selectedIntent);
  }, [selectedIntent]);

  const loadOverride = async (intent: string) => {
    try {
      const sb = getSupabaseClient();
      const { data } = await sb.from('system_prompts' as any).select('prompt_text').eq('intent', intent).single();
      if (data && (data as any).prompt_text) {
        setSystemPrompt((data as any).prompt_text);
      }
    } catch (e) {
      // Ignore if no override exists
    }
  };

  const handleRun = async () => {
    setRunning(true);
    setRawResponse('');
    setParsedJson(null);
    try {
      // For testing, we just hit the server endpoint and pass the overridden instruction directly if possible.
      // But getCoachResponseServer from api/ai doesn't take an override, it fetches from builder.
      // E1 spec: "api/ai'a çağrı, raw response ve parsed directive JSON gösterimi side-by-side."
      
      const payload = {
        messages: [{ role: 'user', content: testUserMessage }],
        intent: selectedIntent,
        provider: 'OPENAI', // default fallback
        isMockMode: false
      };
      // call API via proxy
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setRawResponse(data.text || data.raw || JSON.stringify(data));
      // if WantDirective is true or if it's sent back:
      setParsedJson(data.directive || null);
    } catch (err: any) {
      setRawResponse('Error: ' + err.message);
    } finally {
      setRunning(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const sb = getSupabaseClient();
      const { error } = await sb
        .from('system_prompts' as any)
        .upsert({ intent: selectedIntent, prompt_text: systemPrompt } as any, { onConflict: 'intent' });
      if (error) throw error;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full text-zinc-800 dark:text-zinc-200">
      {/* Left Column: Input Config */}
      <div className="flex-1 flex flex-col space-y-4">
        <div>
          <label className="text-xs font-bold uppercase text-zinc-500 mb-1 block">Intent (Amaç)</label>
          <select 
            value={selectedIntent}
            onChange={(e) => setSelectedIntent(e.target.value as CoachIntent)}
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-sm"
          >
            {INTENTS.map(i => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 flex flex-col min-h-[250px]">
          <label className="text-xs font-bold uppercase text-zinc-500 mb-1 flex justify-between">
            <span>System Prompt Override</span>
            <span className="text-[10px] text-[#C17767]">Database'e yazılır</span>
          </label>
          <textarea 
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="flex-1 w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-xs font-mono resize-none focus:outline-none focus:border-[#C17767]"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-zinc-500 mb-1 block">Test User Message</label>
          <textarea 
            value={testUserMessage}
            onChange={(e) => setTestUserMessage(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-[#C17767]"
            rows={3}
          />
        </div>

        <div className="flex gap-3">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex justify-center items-center gap-2 p-3 bg-zinc-800 text-white rounded-xl text-xs font-bold uppercase hover:bg-zinc-700 transition"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : saveSuccess ? <CheckCircle size={16} className="text-green-400" /> : <Save size={16} />}
            {saveSuccess ? 'Kaydedildi' : 'Veritabanına Kaydet'}
          </button>
          
          <button 
            onClick={handleRun}
            disabled={running}
            className="flex-1 flex justify-center items-center gap-2 p-3 bg-[#C17767] text-white rounded-xl text-xs font-bold uppercase hover:bg-[#A66052] transition"
          >
            {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Testi Çalıştır
          </button>
        </div>
        <p className="text-[10px] text-zinc-500 italic">Not: Çalıştırmadan önce kaydetmeniz test sonucunu etkiler (Çünkü api veritabanından çeker).</p>
      </div>

      {/* Right Column: Output */}
      <div className="flex-1 flex flex-col space-y-4">
         <div className="flex-1 flex flex-col min-h-[200px]">
          <label className="text-xs font-bold uppercase text-zinc-500 mb-1 block">Raw Output (Text)</label>
          <div className="flex-1 p-4 bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-y-auto text-xs font-mono whitespace-pre-wrap">
            {running ? 'Waiting for AI response...' : (rawResponse || 'No data.')}
          </div>
         </div>
         <div className="flex-1 flex flex-col min-h-[200px]">
          <label className="text-xs font-bold uppercase text-[#C17767] mb-1 block">Parsed JSON (Directive)</label>
          <div className="flex-1 p-4 bg-zinc-50 dark:bg-black border border-[#C17767]/20 rounded-lg overflow-y-auto text-xs font-mono">
            {parsedJson ? (
              <pre className="whitespace-pre-wrap">{JSON.stringify(parsedJson, null, 2)}</pre>
            ) : (
              <div className="text-zinc-500 italic">{running ? 'Waiting for AI response...' : 'Valid JSON could not be parsed or not run yet.'}</div>
            )}
          </div>
         </div>
      </div>
    </div>
  );
}
