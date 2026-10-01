from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]

LABEL_TO_ID = {
    'مكتب إداري عسكري': 'military-office',
    'ممرات المبنى': 'building-corridor',
    'أمام لوحة شعار القطاع': 'sector-emblem-wall',
    'مواقف سيارات القطاع': 'sector-parking',
    'شارع فلل سكني': 'residential-villa-street',
    'حي سكني حديث': 'modern-residential-neighborhood',
    'شارع تجاري محلي': 'local-commercial-street',
    'أمام مقهى': 'cafe-front',
    'موقف سيارات': 'parking-lot',
    'حديقة حي عامة': 'neighborhood-park',
    'ممشى رياضي': 'fitness-walkway',
    'داخل السيارة': 'car-interior',
    'بجانب السيارة متوقفة': 'beside-parked-car',
    'في منتصف الصالة': 'living-room-center',
    'بجانب النافذة': 'by-window',
    'أمام التلفاز': 'in-front-of-tv',
    'بجانب السرير': 'beside-bed',
    'على حافة السرير': 'bed-edge',
    'أمام الدولاب': 'wardrobe-front',
    'مع اللابتوب': 'with-laptop',
    'بجانب الأثقال': 'beside-weights',
    'أمام المرآة': 'mirror-area',
    'في منطقة الأجهزة': 'equipment-area',
}


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_exact(path: str, old: str, new: str, expected: int = 1) -> None:
    text = read(path)
    count = text.count(old)
    if count != expected:
        raise RuntimeError(f'{path}: expected {expected} occurrences, found {count}: {old[:100]!r}')
    write(path, text.replace(old, new))


# Replace exact legacy sub-scene label literals everywhere except the presentation catalog.
for path in (ROOT / 'src').rglob('*'):
    if path.suffix not in {'.ts', '.tsx'} or path.as_posix().endswith('src/data/subScenes.ts'):
        continue
    text = path.read_text(encoding='utf-8')
    for label, sub_scene_id in LABEL_TO_ID.items():
        text = text.replace(f"'{label}'", f"'{sub_scene_id}'")
    path.write_text(text, encoding='utf-8')

# SceneState now owns a typed stable sub-scene id.
replace_exact(
    'src/types/scene.ts',
    "import type { LightingKind } from '../engine/lighting';",
    "import type { LightingKind } from '../engine/lighting';\nimport type { SubSceneId } from '../data/subScenes';"
)
replace_exact('src/types/scene.ts', '  subScene: string;', "  subScene: SubSceneId | '';")

# Scene-family configuration stores ids while the UI resolves Arabic labels from the catalog.
replace_exact(
    'src/data/sceneOptions.ts',
    "import type { LightingKind } from '../engine/lighting';",
    "import type { LightingKind } from '../engine/lighting';\nimport type { SubSceneId } from './subScenes';"
)
scene_options = read('src/data/sceneOptions.ts')
scene_options, cast_count = re.subn(
    r'(subScenes:\s*\[[^\]]*\])(?!\s+as SubSceneId\[\])',
    r'\1 as SubSceneId[]',
    scene_options
)
if cast_count != 6:
    raise RuntimeError(f'src/data/sceneOptions.ts: expected 6 subScenes arrays, found {cast_count}')
write('src/data/sceneOptions.ts', scene_options)

# Active scene UI displays Arabic labels but emits stable ids.
replace_exact(
    'src/components/ActiveSceneBasicsSection.tsx',
    "import { SCENE_FAMILIES, VIBE_PRESETS } from '../data/sceneOptions';",
    "import { SCENE_FAMILIES, VIBE_PRESETS } from '../data/sceneOptions';\nimport { getSubSceneLabel, type SubSceneId } from '../data/subScenes';"
)
replace_exact(
    'src/components/ActiveSceneBasicsSection.tsx',
    '  onSubSceneChange: (subScene: string) => void;',
    '  onSubSceneChange: (subScene: SubSceneId) => void;'
)
replace_exact(
    'src/components/ActiveSceneBasicsSection.tsx',
    '              {sub}',
    '              {getSubSceneLabel(sub)}'
)

# Capabilities use sub-scene ids as keys and arguments.
capabilities = read('src/engine/capabilities.ts')
capabilities = "import type { SubSceneId } from '../data/subScenes';\n\n" + capabilities
capabilities = capabilities.replace(
    '  subScenes?: Readonly<Record<string, SubSceneCapability>>;',
    '  subScenes?: Readonly<Partial<Record<SubSceneId, SubSceneCapability>>>;'
)
capabilities = capabilities.replace('subScene: string', "subScene: SubSceneId | ''")
write('src/engine/capabilities.ts', capabilities)

# Lighting profiles and recommendation logic reason about stable sub-scene ids.
lighting = read('src/engine/lighting.ts')
lighting = lighting.replace(
    "import { isOutdoorContext, type SceneFamilyId } from './capabilities';",
    "import type { SubSceneId } from '../data/subScenes';\nimport { isOutdoorContext, type SceneFamilyId } from './capabilities';"
)
lighting = lighting.replace('  subSceneKeywords?: readonly string[];', '  subSceneIds?: readonly SubSceneId[];')
lighting = lighting.replace('subScene: string', "subScene: SubSceneId | ''")
profile_replacements = {
    "subSceneKeywords: ['ممر']": "subSceneIds: ['building-corridor']",
    "subSceneKeywords: ['مقهى', 'تجاري']": "subSceneIds: ['cafe-front', 'local-commercial-street']",
    "subSceneKeywords: ['مواقف', 'موقف', 'السيارة']": "subSceneIds: ['sector-parking', 'parking-lot', 'beside-parked-car']",
    "subSceneKeywords: ['التلفاز']": "subSceneIds: ['in-front-of-tv']",
}
for old, new in profile_replacements.items():
    if old not in lighting:
        raise RuntimeError(f'src/engine/lighting.ts: missing profile marker {old!r}')
    lighting = lighting.replace(old, new)
old_helper = "const keywordMatch = (profile: LightingProfile, subScene: SubSceneId | ''): boolean =>\n  !profile.subSceneKeywords?.length || profile.subSceneKeywords.some(keyword => subScene.includes(keyword));"
new_helper = "const subSceneMatch = (profile: LightingProfile, subScene: SubSceneId | ''): boolean =>\n  !profile.subSceneIds?.length || (subScene !== '' && profile.subSceneIds.includes(subScene));"
if old_helper not in lighting:
    raise RuntimeError('src/engine/lighting.ts: keywordMatch helper not found after signature migration')
lighting = lighting.replace(old_helper, new_helper)
lighting = lighting.replace('if (!keywordMatch(profile, subScene)) return false;', 'if (!subSceneMatch(profile, subScene)) return false;')

# Replace brittle Arabic keyword semantics with explicit ids.
logic_replacements = [
    ("subScene.includes('مقهى') || subScene.includes('تجاري')", "subScene === 'cafe-front' || subScene === 'local-commercial-street'"),
    ("subScene.includes('فلل') || subScene.includes('سكني')", "subScene === 'residential-villa-street' || subScene === 'modern-residential-neighborhood'"),
    ("subScene.includes('داخل')", "subScene === 'car-interior'"),
    ("subScene.includes('مكتب')", "subScene === 'military-office'"),
    ("subScene.includes('ممر')", "subScene === 'building-corridor'"),
    ("subScene.includes('مواقف')", "subScene === 'sector-parking'"),
    ("subScene.includes('النافذة')", "subScene === 'by-window'"),
    ("subScene.includes('التلفاز')", "subScene === 'in-front-of-tv'"),
    ("subScene.includes('موقف')", "subScene === 'parking-lot'"),
]
for old, new in logic_replacements:
    lighting = lighting.replace(old, new)
if 'subScene.includes(' in lighting:
    raise RuntimeError('src/engine/lighting.ts: residual subScene.includes() logic remains')
if 'subSceneKeywords' in lighting:
    raise RuntimeError('src/engine/lighting.ts: residual subSceneKeywords remain')
write('src/engine/lighting.ts', lighting)

# Rules expose typed sub-scene ids.
replace_exact(
    'src/engine/rules.ts',
    "import {\n  getSceneLightingKinds,",
    "import type { SubSceneId } from '../data/subScenes';\nimport {\n  getSceneLightingKinds,"
)
replace_exact('src/engine/rules.ts', '  subScenes: readonly string[];', '  subScenes: readonly SubSceneId[];')
replace_exact('src/engine/rules.ts', '  subScene: string;', "  subScene: SubSceneId | '';")

# Persisted current scenes and saved presets transparently migrate legacy Arabic labels.
replace_exact(
    'src/state/sceneState.ts',
    "import { EXPRESSIONS, HAIRSTYLES, SCENE_FAMILIES } from '../data/sceneOptions';",
    "import { EXPRESSIONS, HAIRSTYLES, SCENE_FAMILIES } from '../data/sceneOptions';\nimport { resolveSubSceneId } from '../data/subScenes';"
)
replace_exact(
    'src/state/sceneState.ts',
    "  const next: SceneState = { ...DEFAULT_STATE, ...(raw as Partial<SceneState>) };\n  next.lightingMode = resolveLightingKind(raw.lightingMode ?? next.lightingMode);",
    "  const next: SceneState = { ...DEFAULT_STATE, ...(raw as Partial<SceneState>) };\n  next.subScene = resolveSubSceneId(raw.subScene ?? next.subScene);\n  next.lightingMode = resolveLightingKind(raw.lightingMode ?? next.lightingMode);"
)

# Replace remaining scene-logic keyword checks outside the lighting engine.
background = read('src/engine/backgroundDynamics.ts')
background = background.replace("state.subScene.includes('مواقف')", "state.subScene === 'sector-parking'")
background = background.replace("state.subScene.includes('داخل')", "state.subScene === 'car-interior'")
if 'state.subScene.includes(' in background:
    raise RuntimeError('src/engine/backgroundDynamics.ts: residual subScene.includes() logic remains')
write('src/engine/backgroundDynamics.ts', background)

realism = read('src/engine/realismState.ts')
realism = realism.replace("state.subScene.includes('مواقف')", "state.subScene === 'sector-parking'")
if 'state.subScene.includes(' in realism:
    raise RuntimeError('src/engine/realismState.ts: residual subScene.includes() logic remains')
write('src/engine/realismState.ts', realism)

# Add explicit persistence migration coverage after the broad literal migration.
replace_exact(
    'src/state/sceneState.test.ts',
    "  it('falls back from invalid enum-like values', () => {",
    "  it('migrates legacy Arabic sub-scene labels to stable machine ids', () => {\n    expect(normalizeSceneState({ sceneFamily: 'car', subScene: 'داخل السيارة' }).subScene).toBe('car-interior');\n    expect(normalizeSceneState({ sceneFamily: 'bedroom', subScene: 'أمام الدولاب' }).subScene).toBe('wardrobe-front');\n  });\n\n  it('falls back from invalid enum-like values', () => {"
)

# Domain sanity: full Arabic sub-scene labels now belong only to the presentation catalog
# and the explicit legacy-migration regression test.
for path in (ROOT / 'src').rglob('*'):
    if path.suffix not in {'.ts', '.tsx'}:
        continue
    if path.as_posix().endswith('src/data/subScenes.ts') or path.as_posix().endswith('src/state/sceneState.test.ts'):
        continue
    text = path.read_text(encoding='utf-8')
    for label in LABEL_TO_ID:
        if f"'{label}'" in text:
            raise RuntimeError(f'{path}: legacy sub-scene label remains as a domain literal: {label}')

print('Sub-scene stable-id migration completed successfully.')
