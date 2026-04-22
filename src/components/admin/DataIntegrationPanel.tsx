import React, { useState } from 'react';
import { Database, UploadCloud, Link as LinkIcon, Download, Loader2, FileJson, Table } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { importDataFromFile } from '../../utils/dataImport';
import { pushLogsToNotion } from '../../services/notionService';

export function DataIntegrationPanel() {
  const [notionKey, setNotionKey] = useState('');
  const [notionDb, setNotionDb] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');

  const logs = useAppStore(s => s.logs);
  const exams = useAppStore(s => s.exams);
  const chatHistory = useAppStore(s => s.chatHistory);
  const profile = useAppStore(s => s.profile);

  const handleExport = () => {
    const data = { profile, logs, exams, chatHistory };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boho_mentos_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('Veriler JSON olarak indirildi.');
  };

  const handleNotionSync = async () => {
    setSyncing(true);
    setMessage('');
    const res = await pushLogsToNotion({ apiKey: notionKey, databaseId: notionDb }, logs, exams);
    setMessage(res.message || (res.success ? 'Başarılı' : 'Hata'));
    setSyncing(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage('');
    const res = await importDataFromFile(file);
    setMessage(res.message);
    setImporting(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <Database className="text-blue-400" size={24} />
          <h2 className="text-xl font-bold">Veri Dışa Aktarımı (Notion)</h2>
        </div>
        <p className="text-sm text-zinc-400 mb-6">
          Log ve Deneme verilerinizi otomatik olarak Notion hesabınıza yedekleyin. 
          (Samsung Notes ve Google Keep API'leri dış geliştiricilere kapalı olduğu için şu an desteklenmemektedir.)
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider block mb-1">Notion Internal API Key</label>
            <input 
              type="password" 
              value={notionKey} 
              onChange={e => setNotionKey(e.target.value)} 
              placeholder="secret_..." 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider block mb-1">Database ID</label>
            <input 
               type="text" 
               value={notionDb} 
               onChange={e => setNotionDb(e.target.value)} 
               placeholder="Örn: a1b2c3d4..." 
               className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <button 
            onClick={handleNotionSync}
            disabled={syncing || !notionKey || !notionDb}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-6 py-3 rounded-xl font-bold transition"
          >
            {syncing ? <Loader2 size={18} className="animate-spin" /> : <LinkIcon size={18} />}
            Notion'a Eşitle
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <UploadCloud className="text-emerald-400" size={24} />
          <h2 className="text-xl font-bold">Veri Yükleme (İçe Aktar)</h2>
        </div>
        <p className="text-sm text-zinc-400 mb-6">
          .json, .csv veya eski verilerinizi sisteme doğrudan aktarın. Mevcut verilerinizi silmez, üzerine ekler.
        </p>

        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-zinc-700 border-dashed rounded-2xl cursor-pointer bg-zinc-950 hover:bg-zinc-800 transition">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <div className="flex gap-2 mb-2 text-zinc-400">
               <FileJson size={20} /> <Table size={20} />
            </div>
            <p className="mb-2 text-sm text-zinc-400"><span className="font-semibold text-emerald-400">Dosya seç</span> veya sürükle bırak</p>
            <p className="text-xs text-zinc-500">JSON veya CSV (MAX. 5MB)</p>
          </div>
          <input 
            type="file" 
            className="hidden" 
            accept=".json,.csv,.txt"
            onChange={handleFileUpload}
            disabled={importing}
          />
        </label>
        {importing && <div className="mt-4 flex items-center justify-center gap-2 text-sm text-emerald-400"><Loader2 size={16} className="animate-spin"/> Yükleniyor...</div>}

        <div className="mt-6 border-t border-zinc-800 pt-6">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 w-full justify-center bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl font-bold transition"
          >
            <Download size={18} />
            Tüm Verilerimi Dışa Aktar (.json)
          </button>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-zinc-800 border border-zinc-700 rounded-xl text-sm font-medium">
          ℹ️ {message}
        </div>
      )}
    </div>
  );
}
