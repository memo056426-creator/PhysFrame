from pathlib import Path

path = Path('src/App.tsx')
text = path.read_text()

imports_to_remove = [
    "import { getCompatibleLightingSuggestions, getSmartDayTime, getSmartLightingSuggestions } from './engine/lighting';\n",
    "import { buildPromptText } from './engine/promptText';\n",
    "import { resolveSceneConflicts } from './engine/rules';\n",
    "import { buildSmartComposition } from './engine/smartComposition';\n",
    "import { deriveRealismState } from './engine/realismState';\n",
    "import { buildSemanticScene } from './engine/semanticScene';\n",
    "import { SCENE_FAMILIES } from './data/sceneOptions';\n",
    "import type { VibePreset } from './data/sceneOptions';\n",
]

for line in imports_to_remove:
    if line not in text:
        raise SystemExit(f'Missing expected import: {line.strip()}')
    text = text.replace(line, '')

anchor = "import { DEFAULT_STATE } from './state/sceneState';\n"
if anchor not in text:
    raise SystemExit('Missing DEFAULT_STATE import anchor')
text = text.replace(
    anchor,
    anchor + "import { useSceneOrchestration } from './hooks/useSceneOrchestration';\n",
    1,
)

old_types = """import type {\n  CameraAngle,\n  CaptureType,\n  Framing,\n  FramingImperfection,\n  GroupSelfieCompanionCount,\n  SavedPreset,\n  SceneFamilyId,\n  SceneState,\n  TimeOfDay\n} from './types/scene';\n"""
new_types = "import type { SavedPreset, SceneState } from './types/scene';\n"
if old_types not in text:
    raise SystemExit('Missing expected scene type import block')
text = text.replace(old_types, new_types, 1)

start = text.find('  const activeFamily =')
end = text.find('  const handleImageUpload =')
if start == -1 or end == -1 or end <= start:
    raise SystemExit('Could not locate scene orchestration block')

hook_call = """  const {\n    activeFamily,\n    lightingSuggestions,\n    compatibleLightingSuggestions,\n    smartDayLabel,\n    handleTimeSelection,\n    handleSmartLightingPeriod,\n    handleSceneSelect,\n    handleSmartComposition,\n    handleVibePreset,\n    chatGPTPrompt,\n    geminiPrompt\n  } = useSceneOrchestration(state, setState);\n\n"""
text = text[:start] + hook_call + text[end:]

prompt_start = text.find('  let chatGPTPrompt =')
prompt_end = text.find('\n\n  return (', prompt_start)
if prompt_start == -1 or prompt_end == -1:
    raise SystemExit('Could not locate prompt derivation block')
text = text[:prompt_start] + text[prompt_end + 2:]

path.write_text(text)
