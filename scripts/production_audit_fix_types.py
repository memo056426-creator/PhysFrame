from pathlib import Path

path = Path('src/App.tsx')
text = path.read_text()
old = "const raw = candidate && typeof candidate === 'object' ? { ...(candidate as Partial<SceneState> & Record<string, unknown>) } : {};"
new = "const raw: Record<string, unknown> = candidate && typeof candidate === 'object' ? { ...(candidate as Record<string, unknown>) } : {};"
if old not in text:
    raise SystemExit('normalizeSceneState raw-state marker not found')
text = text.replace(old, new, 1)
path.write_text(text)
print('Legacy state migration typing fixed.')
