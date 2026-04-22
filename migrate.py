import re

with open('src/store/appStore.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = re.sub(
    r"import\s*\{\s*tombstoneEntityInSupabase(?:.|\n)*?from\s*'../services/supabaseSync';",
    "import { doc, setDoc, deleteDoc } from 'firebase/firestore';\nimport { db } from '../services/firebase';",
    content
)

# 2. Add log
content = re.sub(
    r"void pushToSupabase\(uid, \{ logs: newLogs, streakDays: newStreak, trophies \}\);\s*//.*?recordEloActivity\('log'.*?\}\);",
    "setDoc(doc(db, 'users', uid), { streakDays: newStreak, trophies, eloScore: newEloScore }, { merge: true }).catch(console.error);\n           setDoc(doc(db, 'users', uid, 'logs', logWithId.id), logWithId).catch(console.error);",
    content,
    flags=re.DOTALL
)

# 3. Remove log
content = re.sub(
    r"void tombstoneEntityInSupabase\(uid, 'logs', id\);\s*void pushToSupabase\(uid, \{ logs: newLogs \}\);",
    "deleteDoc(doc(db, 'users', uid, 'logs', id)).catch(console.error);",
    content
)

# 4. Update log
content = re.sub(
    r"if \(uid\) void pushToSupabase\(uid, \{ logs: newLogs \}\);",
    "if (uid) {\n          const updatedLog = newLogs.find(l => l.id === id);\n          if (updatedLog) setDoc(doc(db, 'users', uid, 'logs', id), updatedLog, { merge: true }).catch(console.error);\n        }",
    content
)

# 5. Add exam
content = re.sub(
    r"void pushToSupabase\(uid, \{ exams: newExams, trophies \}\);\s*//.*?recordEloActivity\('exam'.*?\}\);",
    "setDoc(doc(db, 'users', uid), { trophies, eloScore: newEloScore }, { merge: true }).catch(console.error);\n          setDoc(doc(db, 'users', uid, 'exams', normalizedExam.id), normalizedExam).catch(console.error);",
    content,
    flags=re.DOTALL
)

# 6. Remove exam
content = re.sub(
    r"void tombstoneEntityInSupabase\(uid, 'exams', id\);\s*void pushToSupabase\(uid, \{ exams: newExams \}\);",
    "deleteDoc(doc(db, 'users', uid, 'exams', id)).catch(console.error);",
    content
)

# 7. Update exam
content = re.sub(
    r"if \(uid\) void pushToSupabase\(uid, \{ exams: newExams \}\);",
    "if (uid) {\n          const updatedExam = newExams.find(e => e.id === id);\n          if (updatedExam) setDoc(doc(db, 'users', uid, 'exams', id), updatedExam, { merge: true }).catch(console.error);\n        }",
    content
)

# 8. pushSingleEntityToSupabase -> setDoc
content = re.sub(
    r"pushSingleEntityToSupabase\((uid|authUser\.uid), '([^']+)', (.*?) as unknown as Record<string, unknown>\);",
    r"setDoc(doc(db, 'users', \1, '\2', \3.id), \3).catch(console.error);",
    content
)
# specific match without "as unknown as..."
content = re.sub(
    r"pushSingleEntityToSupabase\((uid|authUser\.uid), '([^']+)', ([^)]+)\);",
    r"setDoc(doc(db, 'users', \1, '\2', \3.id), \3).catch(console.error);",
    content
)

# 9. tombstone -> deleteDoc
content = re.sub(
    r"tombstoneEntityInSupabase\((uid|authUser\.uid), '([^']+)', (id|[^)]+)\);",
    r"deleteDoc(doc(db, 'users', \1, '\2', \3)).catch(console.error);",
    content
)

# 10. Record Elo activity inside Tyt/Ayt subjects update (which are lists, so we should merge the root array)
content = re.sub(
    r"void pushToSupabase\(uid, \{ (tytSubjects|aytSubjects): newSubs, trophies \}\);\s*//.*?recordEloActivity.*?\}\);",
    r"setDoc(doc(db, 'users', uid), { \1: newSubs, trophies, eloScore: newElo }, { merge: true }).catch(console.error);",
    content,
    flags=re.DOTALL
)

# 11. Other root pushes
content = re.sub(
    r"void pushToSupabase\((uid|authUser\.uid), ([^)]+)\)(?: as never)?;",
    r"setDoc(doc(db, 'users', \1), \2, { merge: true }).catch(console.error);",
    content
)

# write it back
with open('src/store/appStore.ts', 'w', encoding='utf-8') as f:
    f.write(content)
