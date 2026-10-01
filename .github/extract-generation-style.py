from pathlib import Path

path = Path('src/App.tsx')
text = path.read_text()

import_anchor = "import { ImperfectionsSection } from './components/ImperfectionsSection';\n"
new_import = import_anchor + "import { GenerationStyleSection } from './components/GenerationStyleSection';\n"
if new_import not in text:
    if import_anchor not in text:
        raise SystemExit('Import anchor not found')
    text = text.replace(import_anchor, new_import, 1)

text = text.replace('  RealismStyle,\n', '', 1)

old = '''                <section>\n                   <h3 className="font-medium mb-3">نمط محرك التوليد</h3>\n                   <div className="flex justify-between items-center p-1 bg-white/5 rounded-xl border border-[var(--border)] focus-within:ring-2 focus-within:ring-[var(--accent)]">\n                      <select value={state.realismStyle} onChange={e => setState({...state, realismStyle: e.target.value as RealismStyle})} className="w-full bg-transparent text-[var(--accent)] text-sm outline-none rounded p-3 font-bold cursor-pointer">\n                         <option value="anti-ai-raw">خام مضاد للاكتشاف 🚀 (موصى به)</option>\n                         <option value="raw-candid">واقعي طبيعي</option>\n                         <option value="cinematic-realism">واقعي سينمائي (قد يبدو AI)</option>\n                      </select>\n                   </div>\n                </section>'''
new = '''                <GenerationStyleSection\n                  realismStyle={state.realismStyle}\n                  onRealismStyleChange={realismStyle => setState(current => ({ ...current, realismStyle }))}\n                />'''

if old not in text:
    raise SystemExit('Generation style block not found')
text = text.replace(old, new, 1)
path.write_text(text)
