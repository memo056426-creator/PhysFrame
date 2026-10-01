from pathlib import Path

path = Path('src/App.tsx')
text = path.read_text()

import_anchor = "import { PresetsSheet } from './components/PresetsSheet';\n"
import_line = "import { BottomActionBar } from './components/BottomActionBar';\n"
if import_line not in text:
    if import_anchor not in text:
        raise SystemExit('PresetsSheet import anchor not found')
    text = text.replace(import_anchor, import_anchor + import_line, 1)

start_marker = '        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-[var(--bg-main)]/95 backdrop-blur-md border-t border-[var(--border)] pb-[calc(1rem+env(safe-area-inset-bottom))] z-30">\n'
end_marker = '        {showPromptSheet && (\n'

start = text.find(start_marker)
if start == -1:
    raise SystemExit('Bottom action bar start marker not found')
end = text.find(end_marker, start)
if end == -1:
    raise SystemExit('Prompt sheet marker not found')

replacement = '''        <BottomActionBar
          hasScene={Boolean(state.sceneFamily)}
          sceneLabel={activeFamily?.labelAR ?? null}
          activity={state.activity}
          onSavePreset={handleSavePreset}
          onRandomize={handleSmartComposition}
          onShowPrompt={() => setShowPromptSheet(true)}
        />

'''

text = text[:start] + replacement + text[end:]
path.write_text(text)
