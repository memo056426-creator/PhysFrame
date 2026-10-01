from pathlib import Path

path = Path('src/App.tsx')
text = path.read_text()

import_anchor = "import { PromptSheet } from './components/PromptSheet';\n"
import_replacement = import_anchor + "import { PresetsSheet } from './components/PresetsSheet';\n"
if "import { PresetsSheet } from './components/PresetsSheet';" not in text:
    if import_anchor not in text:
        raise SystemExit('PromptSheet import anchor not found')
    text = text.replace(import_anchor, import_replacement, 1)

old = '''        {showPresetsSheet && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end max-w-md mx-auto">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPresetsSheet(false)}></div>
            <div className="relative bg-[var(--bg-card)] w-full max-h-[70vh] rounded-t-3xl border-t border-white/10 flex flex-col shadow-2xl animate-[slideUp_0.3s_ease-out]">
               <div className="p-5 border-b border-white/5 flex justify-between items-center">
                  <h3 className="text-lg font-bold">القوالب المحفوظة</h3>
                  <button onClick={() => setShowPresetsSheet(false)} aria-label="إغلاق" className="text-[var(--text-muted)] p-2 hover:bg-white/10 rounded-full focus-ring transition-colors">
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
               </div>
               <div className="flex-1 overflow-y-auto p-5">
                  {presets.length === 0 ? (
                    <div className="text-center text-[var(--text-muted)] py-10 text-sm">لا يوجد قوالب محفوظة حالياً.</div>
                  ) : (
                    <div className="space-y-3">
                      {presets.map(preset => (
                        <div key={preset.id} className="bg-[var(--bg-hover)] border border-white/5 p-4 rounded-xl flex justify-between items-center focus-within:ring-2 focus-within:ring-[var(--accent)]">
                           <div className="flex-1 cursor-pointer outline-none" tabIndex={0} onClick={() => {setState(preset.state); setShowPresetsSheet(false);}}>
                             <h4 className="font-medium text-sm mb-1">{preset.name}</h4>
                             <p className="text-xs text-[var(--text-muted)]">{preset.state.captureType} • {preset.state.subScene}</p>
                           </div>
                           <button onClick={() => deletePreset(preset.id)} aria-label="حذف" className="text-red-400/70 p-3 hover:bg-white/5 rounded-full focus:outline-none focus:ring-2 focus:ring-red-400 transition-colors">
                             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                           </button>
                        </div>
                      ))}
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}'''

new = '''        {showPresetsSheet && (
          <PresetsSheet
            presets={presets}
            onSelectPreset={preset => { setState(preset.state); setShowPresetsSheet(false); }}
            onDeletePreset={deletePreset}
            onClose={() => setShowPresetsSheet(false)}
          />
        )}'''

if old not in text:
    raise SystemExit('Presets sheet block not found')
text = text.replace(old, new, 1)
path.write_text(text)
