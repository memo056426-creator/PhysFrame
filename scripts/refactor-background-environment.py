from pathlib import Path

path = Path('src/App.tsx')
text = path.read_text()

import_anchor = "import { GenerationStyleSection } from './components/GenerationStyleSection';\n"
import_line = "import { BackgroundEnvironmentSection } from './components/BackgroundEnvironmentSection';\n"
if import_line not in text:
    if import_anchor not in text:
        raise SystemExit('GenerationStyleSection import anchor not found')
    text = text.replace(import_anchor, import_anchor + import_line, 1)

background_type = "  BackgroundDynamics,\n"
if background_type not in text:
    raise SystemExit('BackgroundDynamics type import not found')
text = text.replace(background_type, '', 1)

old_block = '''                <section className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border)]">
                  <h3 className="font-medium mb-3 text-sm text-[var(--text-muted)]">الخلفية والبيئة</h3>
                  <label className="text-[11px] text-[var(--text-muted)] block mb-1">حركة الخلفية</label>
                  <select value={state.backgroundDynamics} onChange={e => setState({...state, backgroundDynamics: e.target.value as BackgroundDynamics})} className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm appearance-none focus-ring">
                    <option value="empty">فارغة وهادئة</option>
                    <option value="casual">عابرون غير مبالين</option>
                    <option value="busy">مزدحمة وحركية</option>
                  </select>
                </section>'''

new_block = '''                <BackgroundEnvironmentSection
                  backgroundDynamics={state.backgroundDynamics}
                  onBackgroundDynamicsChange={backgroundDynamics => setState(current => ({ ...current, backgroundDynamics }))}
                />'''

if text.count(old_block) != 1:
    raise SystemExit(f'Expected exactly one background/environment block, found {text.count(old_block)}')
text = text.replace(old_block, new_block, 1)

path.write_text(text)
