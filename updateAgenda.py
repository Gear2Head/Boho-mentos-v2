import sys

with open('src/components/AgendaPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import_line = "import { InteractiveCalendar } from './dashboard/InteractiveCalendar';\n"
if import_line not in text:
    import_idx = text.rfind('import ', 0, text.find('export function AgendaPage()'))
    text = text[:text.find('\n', import_idx) + 1] + import_line + text[text.find('\n', import_idx) + 1:]

header_end = text.find('</header>') + 9

grid_start = '\n      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">\n        <div className="lg:col-span-7 space-y-8">'
grid_mid = '        </div>\n        <div className="lg:col-span-5 h-[600px] sticky top-6">\n          <InteractiveCalendar />\n        </div>\n      </div>\n'

content_start = text.find('<div className="bg-[#FFFFFF]', header_end)
if content_start == -1:
    content_start = text.find('<div className="bg-[#FFFFFF] dark:bg-zinc-900 border', header_end)

content_end = text.rfind('</div>') 
last_closing_div = text.rfind('</div>', 0, content_end) 
last_last_closing_div = text.rfind('</div>', 0, last_closing_div) 

text = text[:content_start] + grid_start + '\n' + text[content_start:last_last_closing_div + 6] + '\n' + grid_mid + '\n    </div>\n  );\n}\n'

with open('src/components/AgendaPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated AgendaPage.tsx')
