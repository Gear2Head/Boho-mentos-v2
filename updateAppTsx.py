import sys

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

bento_import = "import { BentoDashboard } from './components/dashboard/BentoDashboard';\n"
if bento_import not in text:
    last_import_index = text.rfind('import ', 0, text.find('export default function App()'))
    newline_after_import = text.find('\n', last_import_index)
    text = text[:newline_after_import + 1] + bento_import + text[newline_after_import + 1:]

dash_start = text.find("{activeTab === 'dashboard' && (")
dash_end = text.find("{activeTab === 'countdown' && (", dash_start)

if dash_start != -1 and dash_end != -1:
    old_dashboard = text[dash_start:dash_end]
    new_dashboard = """            {activeTab === 'dashboard' && (
              <BentoDashboard />
            )}

            """
    text = text.replace(old_dashboard, new_dashboard)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated App.tsx")
