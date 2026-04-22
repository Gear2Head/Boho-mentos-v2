import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Target, AlertTriangle, Lightbulb, Zap } from 'lucide-react';

interface CoachParserProps {
  content: string;
}

/**
 * Parses raw Coach Markdown strings to find known data patterns (like True/False counts, 
 * Warnings, Strengths) and renders them as beautiful UI components (badges, cards).
 * The remainder is rendered via standard ReactMarkdown.
 */
export function CoachParser({ content }: CoachParserProps) {
  // Pattern 1: Doğru/Yanlış/Boş Stats (e.g., Doğru: 30, Yanlış: 5, Boş: 5)
  // We can look for simple regex lines containing these metrics.
  
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
    
    // Check for "Zayıf Yan", "Güçlü Yan" highlighting
    if (lower.startsWith('zayıf yan:') || lower.startsWith('**zayıf yan**')) {
      return (
        <div key={idx} className="my-3 p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex items-start gap-3">
          <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
          <div className="text-sm text-red-200/90 leading-relaxed">
            <ReactMarkdown components={markdownComponents}>{block.replace(/\*\*?zayıf yan:?\*\*?/i, '').trim()}</ReactMarkdown>
          </div>
        </div>
      );
    }
    
    if (lower.startsWith('güçlü yan:') || lower.startsWith('**güçlü yan**')) {
      return (
        <div key={idx} className="my-3 p-3 bg-green-500/5 border border-green-500/20 rounded-xl flex items-start gap-3">
          <Zap size={16} className="text-green-400 mt-0.5 shrink-0" />
          <div className="text-sm text-green-200/90 leading-relaxed">
            <ReactMarkdown components={markdownComponents}>{block.replace(/\*\*?güçlü yan:?\*\*?/i, '').trim()}</ReactMarkdown>
          </div>
        </div>
      );
    }

    if (lower.startsWith('yönlendirme:') || lower.startsWith('**yönlendirme**')) {
      return (
        <div key={idx} className="my-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl flex items-start gap-3">
          <Target size={16} className="text-blue-400 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-200/90 leading-relaxed">
            <ReactMarkdown components={markdownComponents}>{block.replace(/\*\*?yönlendirme:?\*\*?/i, '').trim()}</ReactMarkdown>
          </div>
        </div>
      );
    }

    // Default standard block rendering
    return (
      <div key={idx} className="text-sm leading-relaxed mb-3 last:mb-0">
        <ReactMarkdown components={markdownComponents}>{block}</ReactMarkdown>
      </div>
    );
  };

  return <>{blocks.map((block, idx) => renderBlock(block, idx))}</>;
}

const markdownComponents = {
  p: ({ ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="leading-relaxed mb-3 last:mb-0 text-zinc-300" {...props} />
  ),
  li: ({ ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="mb-1.5 leading-relaxed flex items-start gap-2 before:content-['▪'] before:text-[#C17767] before:shrink-0 before:mt-0.5" {...props} />
  ),
  ul: ({ ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="mb-4 space-y-1 list-none pl-0" {...props} />
  ),
  ol: ({ ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="list-decimal pl-5 mb-4 space-y-1.5 text-zinc-300" {...props} />
  ),
  strong: ({ ...props }: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-bold text-white text-opacity-90" {...props} />
  ),
  em: ({ ...props }: React.HTMLAttributes<HTMLElement>) => (
    <em className="italic text-zinc-400" {...props} />
  ),
  h1: ({ ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="text-base font-bold text-zinc-100 mt-4 mb-2" {...props} />
  ),
  h2: ({ ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="text-base font-bold text-zinc-100 mt-4 mb-2" {...props} />
  ),
  h3: ({ ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-sm font-bold text-[#C17767] mt-3 mb-1.5" {...props} />
  ),
  code: ({ inline, ...props }: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) =>
    inline ? (
      <code className="font-mono text-[#C17767] bg-black/30 px-1.5 py-0.5 rounded text-xs border border-white/5" {...props} />
    ) : (
      <code className="block font-mono text-xs bg-black/40 border border-white/5 rounded-xl p-4 overflow-x-auto text-zinc-300 mb-3" {...props} />
    ),
  blockquote: ({ ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className="border-l-2 border-[#C17767] pl-4 italic text-zinc-400 my-3 bg-white/5 py-2 pr-4 rounded-r-lg" {...props} />
  ),
};
