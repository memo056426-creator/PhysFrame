from pathlib import Path

path = Path('src/App.tsx')
text = path.read_text()

import_anchor = "import { LightingSection } from './components/LightingSection';\n"
new_import = "import { ImperfectionsSection } from './components/ImperfectionsSection';\n"
if new_import not in text:
    if import_anchor not in text:
        raise SystemExit('LightingSection import anchor not found')
    text = text.replace(import_anchor, import_anchor + new_import, 1)

for type_line in [
    '  AtmosphericCondition,\n',
    '  ClothingCondition,\n',
    '  ForegroundObstruction,\n',
    '  LensCondition,\n'
]:
    text = text.replace(type_line, '', 1)

start_marker = '                <section className="bg-gradient-to-b from-[#1E1A16] to-[var(--bg-card)] p-4 rounded-2xl border border-[#3A3224] shadow-inner">\n'
heading_marker = '                     <h3 className="font-bold text-[var(--accent)] text-sm tracking-wide">العيوب والعشوائية '
search_from = text.index('<LightingSection')
start = text.index(start_marker, search_from)
heading = text.index(heading_marker, start)
if heading < start:
    raise SystemExit('Imperfections heading not found inside target section')

next_marker = '                <section>\n                   <h3 className="font-medium mb-3">نمط محرك التوليد</h3>'
end = text.index(next_marker, heading)

replacement = '''                <ImperfectionsSection
                  state={state}
                  onLensConditionChange={lensCondition => setState(current => ({ ...current, lensCondition }))}
                  onClothingConditionChange={clothingCondition => setState(current => ({ ...current, clothingCondition }))}
                  onAtmosphericConditionChange={atmosphericCondition => setState(current => ({ ...current, atmosphericCondition }))}
                  onForegroundObstructionChange={foregroundObstruction => setState(current => ({ ...current, foregroundObstruction }))}
                />

'''

text = text[:start] + replacement + text[end:]
path.write_text(text)
