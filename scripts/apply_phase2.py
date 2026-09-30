from pathlib import Path
import re

path = Path('src/App.tsx')
text = path.read_text(encoding='utf-8')
original = text

old_import = "import { getLightingProfile, resolveLightingCompatibility } from './engine/lighting';\nimport { buildPromptIR, lintPromptIR, renderPromptIR, type PromptFacts } from './engine/promptIR';"
new_import = "import { getLightingProfile } from './engine/lighting';\nimport { buildPromptIR, lintPromptIR, renderPromptIR, type PromptFacts } from './engine/promptIR';\nimport { resolveSceneConflicts } from './engine/rules';\nimport { buildSmartComposition } from './engine/smartComposition';"
if old_import not in text:
    raise SystemExit('Expected Phase 1 import block not found')
text = text.replace(old_import, new_import, 1)

pattern = re.compile(
    r"// --- RULES ENGINE & RESOLVERS ---\nconst resolveConflicts = \(state: SceneState\): SceneState => \{.*?\n\};\n\nconst deriveRealismState",
    re.S,
)
text, count = pattern.subn("// --- REALISM DERIVATION ---\nconst deriveRealismState", text, count=1)
if count != 1:
    raise SystemExit(f'Expected exactly one local resolveConflicts block, found {count}')

old_normalize = "  return resolveConflicts(next);"
new_normalize = "  return resolveSceneConflicts(next, next.sceneFamily ? SCENE_FAMILIES[next.sceneFamily] : undefined);"
if old_normalize not in text:
    raise SystemExit('normalizeSceneState resolver call not found')
text = text.replace(old_normalize, new_normalize, 1)

old_effect = """  useEffect(() => {
    if (!state.sceneFamily) return;
    const resolved = resolveConflicts(state);
    if (JSON.stringify(resolved) !== JSON.stringify(state)) setState(resolved);
  }, [state.sceneFamily, state.subScene, state.activity, state.pose, state.lightingMode, state.timeOfDay, state.captureType, state.foregroundObstruction, state.flashMode, state.atmosphericCondition, state.hasGlasses, state.handProp]);"""
new_effect = """  useEffect(() => {
    if (!state.sceneFamily) return;
    const resolved = resolveSceneConflicts(state, SCENE_FAMILIES[state.sceneFamily]);
    if (JSON.stringify(resolved) !== JSON.stringify(state)) setState(resolved);
  }, [state.sceneFamily, state.subScene, state.activity, state.pose, state.lightingMode, state.timeOfDay, state.captureType, state.foregroundObstruction, state.atmosphericCondition, state.hasGlasses, state.handProp, state.environmentRealism]);"""
if old_effect not in text:
    raise SystemExit('Scene resolver effect block not found')
text = text.replace(old_effect, new_effect, 1)

smart_pattern = re.compile(
    r"  const handleSmartComposition = \(\) => \{.*?\n  \};\n\n  const handleVibePreset",
    re.S,
)
smart_replacement = """  const handleSmartComposition = () => {
    setState(current => buildSmartComposition(current, SCENE_FAMILIES));
  };

  const handleVibePreset"""
text, count = smart_pattern.subn(smart_replacement, text, count=1)
if count != 1:
    raise SystemExit(f'Expected exactly one handleSmartComposition block, found {count}')

if 'resolveLightingCompatibility' in text:
    raise SystemExit('Legacy lighting resolver reference survived Phase 2 codemod')
if 'const resolveConflicts' in text:
    raise SystemExit('Local resolveConflicts implementation survived Phase 2 codemod')
if text == original:
    raise SystemExit('No changes applied')

path.write_text(text, encoding='utf-8')
print('Phase 2 App.tsx integration applied successfully')
