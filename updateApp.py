import sys, re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Import the service
if 'uploadImageFile' not in text:
    text = text.replace(
        "import { parseStructuredDirective } from './services/promptBuilder';",
        "import { parseStructuredDirective } from './services/promptBuilder';\nimport { uploadImageFile } from './services/storageService';"
    )

widget_start = text.index('function ArchiveWidget(')
widget_end = text.index('const markdownComponents', widget_start)
widget_old = text[widget_start:widget_end]

# State and UI changes
widget_new = widget_old.replace('const [difficulty, setDifficulty] = useState<\'easy\' | \'medium\' | \'hard\'>(\'medium\');',
'''const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);''')


input_ui = '''
      <div className="mb-4">
        <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 ml-1 block mb-1">SORU FOTOĞRAFI (OPSİYONEL - MAX 5MB)</label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && f.size < 5 * 1024 * 1024) setFile(f);
            else if (f) alert('Dosya boyutu 5 MB\\'ı geçemez.');
          }}
          className="block w-full text-sm text-[#4A443C] dark:text-zinc-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#C17767]/10 file:text-[#C17767] hover:file:bg-[#C17767]/20"
        />
      </div>
'''
widget_new = widget_new.replace('<textarea', input_ui + '\n      <textarea')

# Find exactly this part and replace
search_str = '''onClick={() => {
          if (subject && topic && book) {
            onSubmit({
              id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
              date: new Date().toISOString(),
              subject, topic, book, page, questionNumber, reason,
              difficulty,
              status: 'active',
              solveCount: 0
            });
          }
        }}'''

replace_str = '''onClick={async () => {
          if (subject && topic && book) {
            let imageUrl: string | undefined = undefined;
            if (file) {
              setIsUploading(true);
              try {
                const uid = useAppStore.getState().authUser?.uid || 'unknown';
                imageUrl = await uploadImageFile(file, `failed_questions/${uid}/${Date.now()}_${file.name}`);
              } catch (e) {
                console.error("Resim yüklenemedi", e);
                alert("Resim yüklenemedi, ancak soru eklenecek.");
              } finally {
                setIsUploading(false);
              }
            }
            onSubmit({
              id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
              date: new Date().toISOString(),
              subject, topic, book, page, questionNumber, reason,
              difficulty,
              status: 'active',
              solveCount: 0,
              imageUrl
            });
          }
        }}
        disabled={isUploading}'''

widget_new = widget_new.replace(search_str, replace_str)
widget_new = widget_new.replace('MEZARA GÖNDER', '{isUploading ? "YÜKLENİYOR..." : "MEZARA GÖNDER"}')

text = text[:widget_start] + widget_new + text[widget_end:]

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("App.tsx modified successfully")
