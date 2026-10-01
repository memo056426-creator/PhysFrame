from pathlib import Path

path = Path('src/App.tsx')
text = path.read_text()

import_anchor = "import { BackgroundEnvironmentSection } from './components/BackgroundEnvironmentSection';\n"
import_line = "import { PromptSheet } from './components/PromptSheet';\n"
if import_line not in text:
    if import_anchor not in text:
        raise SystemExit('PromptSheet import anchor not found')
    text = text.replace(import_anchor, import_anchor + import_line, 1)

start_marker = "        {showPromptSheet && (\n"
end_marker = "\n        {showPresetsSheet && (\n"
start = text.find(start_marker)
end = text.find(end_marker, start)
if start == -1 or end == -1:
    raise SystemExit('Prompt sheet block markers not found')

replacement = """        {showPromptSheet && (\n          <PromptSheet\n            activeTab={activeTab}\n            chatGPTPrompt={chatGPTPrompt}\n            geminiPrompt={geminiPrompt}\n            onActiveTabChange={setActiveTab}\n            onClose={() => setShowPromptSheet(false)}\n            onCopy={copyToClipboard}\n          />\n        )}\n"""

text = text[:start] + replacement + text[end:]
path.write_text(text)
