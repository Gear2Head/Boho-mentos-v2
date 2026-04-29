import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Target, AlertTriangle, Lightbulb, Zap, ArrowRight, ExternalLink } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

interface CoachParserProps {
  content: string;
}

/**
 * Parses raw Coach Markdown strings to find known data patterns and custom navigation tags.
 * Syntax: [[NAV:dashboard]], [[OPEN:log_study]]
 */
export function CoachParser({ content }: CoachParserProps) {
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const setLogWidgetOpen = useAppStore((s) => s.setLogWidgetOpen);
  const setExamModalOpen = useAppStore((s) => s.setExamModalOpen);
  const setArchiveWidgetOpen = useAppStore((s) => s.setArchiveWidgetOpen);
  const setEditingProfile = useAppStore((s) => s.setEditingProfile);

  // Pattern detection: [[NAV:tab]] or [[OPEN:action]]
  const processTags = (text: string) => {
    const parts = text.split(/(\[\[(?:NAV|OPEN):[^\]]+\]\])/g);
    return parts.map((part, i) => {
      const navMatch = part.match(/\[\[NAV:([^\]]+)\]\]/);
      const openMatch = part.match(/\[\[OPEN:([^\]]+)\]\]/);

      if (navMatch) {
        const tab = navMatch[1].toLowerCase();
        return (
          <button
            key={i}
            onClick={() => setActiveTab(tab)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 mx-1 bg-accent/10 hover:bg-accent/20 border border-accent/20 text-accent rounded-lg text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-sm"
          >
            <ArrowRight size={12} /> {tab} Sayfasına Git
          </button>
        );
      }

      if (openMatch) {
        const rawAction = openMatch[1].toLowerCase();
        const [action, ...paramParts] = rawAction.split(':');
        const params = new URLSearchParams(paramParts.join('&').replace(/:/g, '&'));
        const handleClick = () => {
          if (action === 'log_study') {
            const date = params.get('date');
            if (date) localStorage.setItem('boho_prefill_log_date', date);
            setLogWidgetOpen(true);
          }
          if (action === 'add_exam') setExamModalOpen(true);
          if (action === 'archive') setArchiveWidgetOpen(true);
          if (action === 'profile') setEditingProfile(true);
        };
        
        const label = action === 'log_study' ? 'Çalışma Kaydet'
          : action === 'add_exam' ? 'Deneme Ekle'
          : action === 'archive' ? 'Arşivi Aç'
          : action === 'profile' ? 'Profili Düzenle'
          : action;

        return (
          <button
            key={i}
            onClick={handleClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 mx-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-sm"
          >
            <ExternalLink size={12} /> {label}
          </button>
        );
      }

      return part;
    });
  };

  const blocks = content.split('\n\n');
  
  const renderBlock = (block: string, idx: number) => {
    const lower = block.toLowerCase();
    
    // Check if it's a stats line
    if (lower.includes('doğru:') || lower.includes('yanlış:') || lower.includes('boş:')) {
      const dMatch = block.match(/doğru:\s*(\d+)/i);
      const yMatch = block.match(/yanlış:\s*(\d+)/i);
      const bMatch = block.match(/boş:\s*(\d+)/i);
      
      if (dMatch || yMatch || bMatch) {
        return (
          <div key={idx} className="flex flex-wrap items-center gap-2 my-3">
            {dMatch && (
              <span className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-xs font-bold font-mono">
                ✓ Doğru: {dMatch[1]}
              </span>
            )}
            {yMatch && (
              <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-xs font-bold font-mono">
                ✕ Yanlış: {yMatch[1]}
              </span>
            )}
            {bMatch && (
              <span className="px-3 py-1 bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 rounded-full text-xs font-bold font-mono">
                ⭕ Boş: {bMatch[1]}
              </span>
            )}
          </div>
        );
      }
    }
    
    // Check for highlights
    if (lower.startsWith('zayıf yan:') || lower.startsWith('**zayıf yan**')) {
      return (
        <div key={idx} className="my-3 p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex items-start gap-3">
          <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <div className="text-sm text-ink leading-relaxed">
            <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>{block.replace(/\*\*?zayıf yan:?\*\*?/i, '').trim()}</ReactMarkdown>
          </div>
        </div>
      );
    }
    
    if (lower.startsWith('güçlü yan:') || lower.startsWith('**güçlü yan**')) {
      return (
        <div key={idx} className="my-3 p-3 bg-green-500/5 border border-green-500/20 rounded-xl flex items-start gap-3">
          <Zap size={16} className="text-green-500 mt-0.5 shrink-0" />
          <div className="text-sm text-ink leading-relaxed">
            <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>{block.replace(/\*\*?güçlü yan:?\*\*?/i, '').trim()}</ReactMarkdown>
          </div>
        </div>
      );
    }

    if (lower.startsWith('yönlendirme:') || lower.startsWith('**yönlendirme**')) {
      return (
        <div key={idx} className="my-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl flex items-start gap-3">
          <Target size={16} className="text-blue-500 mt-0.5 shrink-0" />
          <div className="text-sm text-ink leading-relaxed">
            <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>{block.replace(/\*\*?yönlendirme:?\*\*?/i, '').trim()}</ReactMarkdown>
          </div>
        </div>
      );
    }

    // Default standard block rendering with tag processing
    return (
      <div key={idx} className="text-sm leading-relaxed mb-3 last:mb-0">
        <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>{block}</ReactMarkdown>
      </div>
    );
  };

  const markdownComponents = {
    p: ({ children }: any) => {
      if (typeof children === 'string') {
        return <p className="leading-relaxed mb-3 last:mb-0 text-ink/80">{processTags(children)}</p>;
      }
      return <p className="leading-relaxed mb-3 last:mb-0 text-ink/80">{children}</p>;
    },
    li: ({ children }: any) => (
      <li className="mb-1.5 leading-relaxed flex items-start gap-2 before:content-['▪'] before:text-accent before:shrink-0 before:mt-0.5">
        <span className="text-ink/80">
          {typeof children === 'string' ? processTags(children) : children}
        </span>
      </li>
    ),
    ul: ({ ...props }: any) => <ul className="mb-4 space-y-1 list-none pl-0" {...props} />,
    ol: ({ ...props }: any) => <ol className="list-decimal pl-5 mb-4 space-y-1.5 text-ink/80" {...props} />,
    strong: ({ ...props }: any) => <strong className="font-bold text-ink" {...props} />,
    em: ({ ...props }: any) => <em className="italic text-ink-muted" {...props} />,
    h1: ({ ...props }: any) => <h1 className="text-base font-bold text-ink mt-4 mb-2" {...props} />,
    h2: ({ ...props }: any) => <h2 className="text-base font-bold text-ink mt-4 mb-2" {...props} />,
    h3: ({ ...props }: any) => <h3 className="text-sm font-bold text-accent mt-3 mb-1.5" {...props} />,
    code: ({ inline, ...props }: any) =>
      inline ? (
        <code className="font-mono text-accent bg-accent/5 px-1.5 py-0.5 rounded text-xs border border-accent/10" {...props} />
      ) : (
        <code className="block font-mono text-xs bg-surface-2 border border-app rounded-xl p-4 overflow-x-auto text-ink/80 mb-3" {...props} />
      ),
    blockquote: ({ ...props }: any) => (
      <blockquote className="border-l-2 border-accent pl-4 italic text-ink-muted my-3 bg-accent/5 py-2 pr-4 rounded-r-lg" {...props} />
    ),
    table: ({ ...props }: any) => (
      <div className="overflow-x-auto my-4 w-full rounded-xl border border-app shadow-sm bg-surface">
        <table className="w-full text-left text-xs" {...props} />
      </div>
    ),
    thead: ({ ...props }: any) => <thead className="bg-surface-2 border-b border-app font-black uppercase tracking-widest text-[10px] text-ink-muted" {...props} />,
    tbody: ({ ...props }: any) => <tbody className="divide-y divide-app" {...props} />,
    tr: ({ ...props }: any) => <tr className="hover:bg-accent/5 transition-colors" {...props} />,
    th: ({ ...props }: any) => <th className="px-4 py-3 font-black whitespace-nowrap" {...props} />,
    td: ({ ...props }: any) => <td className="px-4 py-3 text-ink/80 leading-relaxed align-top" {...props} />,
  };

  return <>{blocks.map((block, idx) => renderBlock(block, idx))}</>;
}

