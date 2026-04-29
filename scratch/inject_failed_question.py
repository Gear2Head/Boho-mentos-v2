import sys
import time

filepath = 'src/hooks/useCoachCore.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

new_action = """
                case 'ADD_FAILED_QUESTION':
                  if (action.payload?.subject) {
                    useAppStore.getState().addFailedQuestion({
                      id: 'fq_' + Date.now(),
                      subject: String(action.payload.subject),
                      topic: String(action.payload.topic || 'Genel'),
                      difficulty: String(action.payload.difficulty || 'medium'),
                      createdAt: new Date().toISOString()
                    } as any);
                  }
                  break;
                case 'START_FOCUS':"""

if "case 'START_FOCUS':" in content:
    new_content = content.replace("case 'START_FOCUS':", new_action)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully updated useCoachCore.ts with ADD_FAILED_QUESTION")
else:
    print("Target not found")
