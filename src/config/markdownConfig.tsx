import React from 'react';

export const markdownComponents = {
  p: ({ node, ...props }: any) => <p className="leading-relaxed mb-4 text-[#4A443C] dark:text-zinc-200 text-base" {...props} />,
  li: ({ node, ...props }: any) => <li className="mb-2 leading-relaxed" {...props} />,
  ul: ({ node, ...props }: any) => <ul className="list-disc pl-5 mb-4 space-y-2 opacity-90" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="list-decimal pl-5 mb-4 space-y-2 opacity-90" {...props} />,
  strong: ({ node, ...props }: any) => <strong className="font-bold text-[#C17767] dark:text-rose-400" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="text-lg font-bold font-display italic mt-6 mb-2 border-b border-[#EAE6DF] dark:border-zinc-800 pb-1" {...props} />,
};
