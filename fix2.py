import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(r"import .*OnboardingLayout.*?\n", "", text)
text = re.sub(r"import .*ErrorBoundary.*?\n", "", text)
text = text.replace(
    "const { user, isLoading, signOut } = useAuth();",
    "const { user, isLoading, signOut } = useAuth();\n  const syncStatus = 'synced';\n  const forceSync = async (a?: boolean) => {};\n  const isSyncManagerBusy = false;"
)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
