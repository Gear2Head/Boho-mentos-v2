const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = [
  { from: /bg-\[#FDFBF7\]/g, to: 'bg-[#FDFBF7] dark:bg-zinc-950' },
  { from: /bg-\[#F5F2EB\]/g, to: 'bg-[#F5F2EB] dark:bg-zinc-900' },
  { from: /bg-\[#FFFFFF\]/g, to: 'bg-[#FFFFFF] dark:bg-zinc-900' },
  { from: /bg-\[#EAE6DF\]/g, to: 'bg-[#EAE6DF] dark:bg-zinc-800' },
  { from: /bg-\[#F0EBE1\]/g, to: 'bg-[#F0EBE1] dark:bg-zinc-800' },
  { from: /text-\[#4A443C\]/g, to: 'text-[#4A443C] dark:text-zinc-200' },
  { from: /text-\[#C17767\]/g, to: 'text-[#C17767] dark:text-rose-400' },
  { from: /text-\[#8C857B\]/g, to: 'text-[#8C857B] dark:text-zinc-400' },
  { from: /border-\[#EAE6DF\]/g, to: 'border-[#EAE6DF] dark:border-zinc-800' },
  { from: /divide-\[#EAE6DF\]/g, to: 'divide-[#EAE6DF] dark:divide-zinc-800' },
  { from: /hover:bg-\[#EAE6DF\]/g, to: 'hover:bg-[#EAE6DF] dark:hover:bg-zinc-800' },
  { from: /hover:bg-\[#C17767\]\/5/g, to: 'hover:bg-[#C17767]/5 dark:hover:bg-rose-400/10' },
];

replacements.forEach(({ from, to }) => {
  content = content.replace(from, to);
});

fs.writeFileSync('src/App.tsx', content);
console.log('Replacements done.');
