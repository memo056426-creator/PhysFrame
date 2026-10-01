from pathlib import Path

path = Path('src/App.tsx')
text = path.read_text()

import_anchor = "import { BottomActionBar } from './components/BottomActionBar';\n"
if "import { AppHeader } from './components/AppHeader';\n" not in text:
    text = text.replace(import_anchor, import_anchor + "import { AppHeader } from './components/AppHeader';\n", 1)

old = '''        <header className="px-5 py-4 border-b border-[var(--border)] flex justify-between items-center sticky top-0 bg-[var(--bg-main)]/90 backdrop-blur z-20">
          <div>
            <h1 className="text-xl font-bold tracking-wide">PhysFrame</h1>
            <p className="text-xs text-[var(--text-muted)]">محرك البرومبت الواقعي</p>
          </div>
          <div className="flex gap-3">
             <button aria-label="القوالب المحفوظة" className="text-xs text-[var(--text-muted)] hover:text-white rounded p-1.5 focus-ring transition-colors" onClick={() => setShowPresetsSheet(true)}>القوالب</button>
             <button aria-label="إعادة ضبط الإعدادات" className="text-xs text-[var(--text-muted)] hover:text-white rounded p-1.5 focus-ring transition-colors" onClick={() => {setState(DEFAULT_STATE); clearCurrentSceneState(localStorage);}}>إعادة ضبط</button>
          </div>
        </header>
'''
new = '''        <AppHeader
          onOpenPresets={() => setShowPresetsSheet(true)}
          onReset={() => {
            setState(DEFAULT_STATE);
            clearCurrentSceneState(localStorage);
          }}
        />
'''

if old not in text:
    raise SystemExit('Header block not found')

text = text.replace(old, new, 1)
path.write_text(text)
