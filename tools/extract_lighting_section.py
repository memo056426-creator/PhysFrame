from pathlib import Path

path = Path('src/App.tsx')
text = path.read_text()

advanced_import = "import { AdvancedRealismSection } from './components/AdvancedRealismSection';\n"
lighting_import = "import { LightingSection } from './components/LightingSection';\n"
assert advanced_import in text, 'AdvancedRealismSection import not found'
assert lighting_import not in text, 'LightingSection import already present'
text = text.replace(advanced_import, advanced_import + lighting_import, 1)

heading = 'الوقت والإضاءة الفيزيائية'
next_heading = 'العيوب والعشوائية'
heading_index = text.index(heading)
start = text.rfind('                <section', 0, heading_index)
assert start != -1, 'lighting section start not found'
next_heading_index = text.index(next_heading, heading_index)
end = text.rfind('                <section', heading_index, next_heading_index)
assert end != -1 and end > start, 'next section start not found'

replacement = '''                <LightingSection
                  state={state}
                  lightingSuggestions={lightingSuggestions}
                  compatibleLightingSuggestions={compatibleLightingSuggestions}
                  smartDayLabel={smartDayLabel}
                  onSmartLightingPeriod={handleSmartLightingPeriod}
                  onTimeSelection={handleTimeSelection}
                  onLightingModeChange={lightingMode => setState(current => ({ ...current, lightingMode }))}
                />\n\n'''

text = text[:start] + replacement + text[end:]
path.write_text(text)
