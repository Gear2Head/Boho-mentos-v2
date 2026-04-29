import sys
import time

filepath = 'src/hooks/useCoachCore.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

actions_code = """

          // [ST-003] Client Actions
          if (directive.clientActions && directive.clientActions.length > 0) {
            directive.clientActions.forEach(action => {
              switch (action.type) {
                case 'CELEBRATE':
                  import('canvas-confetti').then(confetti => confetti.default());
                  break;
                case 'OPEN_MARKET':
                  useAppStore.setState({ isCrateModalOpen: true });
                  break;
                case 'START_FOCUS':
                  useAppStore.setState({ isFocusSidePanelOpen: true });
                  break;
              }
            });
          }"""

target = """notes: '🤖 Kübra: Sohbetten otomatik yakalanan çalışma kaydı.'
              });
            });
          }"""

if target in content:
    new_content = content.replace(target, target + actions_code)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully updated useCoachCore.ts")
else:
    print("Target not found")
