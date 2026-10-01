from pathlib import Path

path = Path('src/App.tsx')
text = path.read_text()

old_options_import = "import { FACIAL_HAIR_STATES, FLASH_MODES, GAZE_DIRECTIONS, HAND_PROPS, SCENE_FAMILIES } from './data/sceneOptions';"
new_options_import = "import { SCENE_FAMILIES } from './data/sceneOptions';"
assert old_options_import in text, 'sceneOptions import not found'
text = text.replace(old_options_import, new_options_import, 1)

appearance_import = "import { AppearanceSection } from './components/AppearanceSection';\n"
advanced_import = "import { AdvancedRealismSection } from './components/AdvancedRealismSection';\n"
assert appearance_import in text, 'AppearanceSection import not found'
assert advanced_import not in text, 'AdvancedRealismSection import already present'
text = text.replace(appearance_import, appearance_import + advanced_import, 1)

for type_name in ['FacialHairState', 'FlashMode', 'GazeDirection', 'HandProp']:
    text = text.replace(f'  {type_name},\n', '')

start_token = '                <section className="bg-gradient-to-b from-[#1E1A16] to-[var(--bg-card)] p-4 rounded-2xl border border-[#3A3224] shadow-inner">'
end_token = '\n\n                <section className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border)]">'
start = text.index(start_token)
end = text.index(end_token, start)
replacement = '''                <AdvancedRealismSection
                  state={state}
                  onGazeDirectionChange={gazeDirection => setState(current => ({ ...current, gazeDirection }))}
                  onHandPropChange={handProp => setState(current => ({ ...current, handProp }))}
                  onFacialHairStateChange={facialHairState => setState(current => ({ ...current, facialHairState }))}
                  onFlashModeChange={flashMode => setState(current => ({ ...current, flashMode }))}
                />'''
text = text[:start] + replacement + text[end:]
path.write_text(text)
