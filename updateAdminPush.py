import sys

with open('src/components/admin/AdminDashboard.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import_statement = "import { PushNotificationPanel } from './PushNotificationPanel';\n"
if import_statement not in text:
    idx = text.rfind('import ', 0, text.find('export function AdminDashboard'))
    newline = text.find('\n', idx)
    text = text[:newline+1] + import_statement + text[newline+1:]

old_tabs_type = "'users' | 'my_data' | 'data_integration' | 'entities' | 'audit' | 'system';"
new_tabs_type = "'users' | 'my_data' | 'data_integration' | 'entities' | 'audit' | 'system' | 'push_notifications';"
text = text.replace(old_tabs_type, new_tabs_type)

# Add push notifications to tabs array
old_tab_arr = ", icon: <Settings size={16} /> },\n  ];"
new_tab_arr = ", icon: <Settings size={16} /> },\n    { id: 'push_notifications', label: 'Push & Bildirim', icon: <Bell size={16} /> },\n  ];"
text = text.replace(old_tab_arr, new_tab_arr)

# Wait, `Bell` is used in new_tab_arr but not imported in AdminDashboard.tsx.
# Let's import Bell
import_bell = "import { Bell } from 'lucide-react';\n"
if "Bell" not in text:
    text = text.replace("import { ", "import { Bell, ")

with open('src/components/admin/AdminDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('AdminDashboard updated!')
