import sys

with open('src/components/admin/AdminDashboard.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

sys_panel_start = text.find('function SystemPanel({')
sys_panel_end = text.find('function Stat({', sys_panel_start)

if sys_panel_start == -1 or sys_panel_end == -1:
    sys.exit(1)

text_block = text[sys_panel_start:sys_panel_end]

code_inject = """
  const [config, setConfig] = useState<any>(null);
  const [apiKeys, setApiKeys] = useState<{ groq?: string, gemini?: string, cerebras?: string }>({ groq: '', gemini: '', cerebras: '' });
  const [killSwitch, setKillSwitch] = useState({ aiEngine: false, pushService: false });

  useEffect(() => {
    import('../../services/systemService').then(s => {
      s.getSystemConfig().then(c => {
        if(c) {
          setConfig(c);
          if(c.apiKeys) setApiKeys({ groq: c.apiKeys.groq || '', gemini: c.apiKeys.gemini || '', cerebras: c.apiKeys.cerebras || '' });
          if(c.killSwitch) setKillSwitch(c.killSwitch);
        }
      });
    });
  }, []);

  const saveApiKeys = async () => {
    const s = await import('../../services/systemService');
    const res = await s.updateApiKeys(actorUid, apiKeys);
    if(res.success) showToast('success', 'API Keyler güncellendi');
    else showToast('error', res.error ?? 'Hata');
  };

  const toggleKillSwitch = async (key: 'aiEngine' | 'pushService') => {
    const newVal = { ...killSwitch, [key]: !killSwitch[key] };
    setKillSwitch(newVal);
    const s = await import('../../services/systemService');
    const res = await s.updateKillSwitch(actorUid, newVal);
    if(res.success) showToast('success', 'Kill Switch güncellendi');
    else showToast('error', res.error ?? 'Hata');
  };
"""

text_block = text_block.replace('const store = useAppStore.getState();', 'const store = useAppStore.getState();' + code_inject)

ui_inject = """
        {/* Live Operations & Kill Switch */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h4 className="font-bold text-sm mb-4 text-zinc-400">Live Operations (Taskv3)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-4">
              <h5 className="text-xs font-bold text-zinc-500 uppercase">API Keys</h5>
              <div className="flex flex-col gap-2">
                <input placeholder="GROQ API KEY" value={apiKeys.groq} onChange={e => setApiKeys({...apiKeys, groq: e.target.value})} className="bg-zinc-900 border border-zinc-700 p-2 rounded text-xs" type="password" />
                <input placeholder="GEMINI API KEY" value={apiKeys.gemini} onChange={e => setApiKeys({...apiKeys, gemini: e.target.value})} className="bg-zinc-900 border border-zinc-700 p-2 rounded text-xs" type="password" />
                <input placeholder="CEREBRAS API KEY" value={apiKeys.cerebras} onChange={e => setApiKeys({...apiKeys, cerebras: e.target.value})} className="bg-zinc-900 border border-zinc-700 p-2 rounded text-xs" type="password" />
                <button onClick={saveApiKeys} className="bg-blue-600/20 text-blue-400 py-2 rounded font-bold text-xs hover:bg-blue-600/30">Keyleri Kaydet</button>
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="text-xs font-bold text-zinc-500 uppercase">Master Kill Switch</h5>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center bg-zinc-900 p-3 rounded border border-zinc-800">
                  <div className="text-sm text-zinc-300">AI Motoru</div>
                  <button onClick={() => toggleKillSwitch('aiEngine')} className={`px-4 py-1.5 rounded text-xs font-bold ${killSwitch.aiEngine ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
                    {killSwitch.aiEngine ? 'KAPALI (DONDURULDU)' : 'AKTİF'}
                  </button>
                </div>
                <div className="flex justify-between items-center bg-zinc-900 p-3 rounded border border-zinc-800">
                  <div className="text-sm text-zinc-300">Push Service</div>
                  <button onClick={() => toggleKillSwitch('pushService')} className={`px-4 py-1.5 rounded text-xs font-bold ${killSwitch.pushService ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
                    {killSwitch.pushService ? 'KAPALI (DONDURULDU)' : 'AKTİF'}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
"""

text_block = text_block.replace('{/* Quick System Actions */}', ui_inject + '\n        {/* Quick System Actions */}')

with open('src/components/admin/AdminDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(text.replace(text[sys_panel_start:sys_panel_end], text_block))

print("Updated")
