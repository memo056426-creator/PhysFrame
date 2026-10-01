from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]

LABEL_TO_ID = {
    'عمل مكتبي': 'military-office-work',
    'استراحة قصيرة': 'short-break',
    'مناوبة': 'on-duty',
    'واقف بثبات واعتزاز': 'standing-proud',
    'يمشي بهدوء': 'walking-calmly',
    'واقف بشكل طبيعي': 'standing-natural',
    'ينتظر': 'waiting',
    'جالس في المقهى': 'seated-at-cafe',
    'خلف المقود والسيارة متوقفة': 'parked-behind-wheel',
    'جالس في مقعد الراكب': 'passenger-seat',
    'جالس بهدوء داخل السيارة': 'seated-calm-in-car',
    'جالس على الكنبة': 'seated-on-sofa',
    'يشرب قهوة': 'drinking-coffee',
    'يستخدم الهاتف': 'using-phone',
    'جالس': 'seated',
    'مسترخٍ': 'relaxing',
    'قبل التمرين': 'pre-workout',
    'يستريح بين الجولات': 'rest-between-sets',
    'بعد التمرين': 'post-workout',
}


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_exact(path: str, old: str, new: str, expected: int = 1) -> None:
    text = read(path)
    count = text.count(old)
    if count != expected:
        raise RuntimeError(f'{path}: expected {expected} occurrences, found {count}: {old[:120]!r}')
    write(path, text.replace(old, new))


for path in (ROOT / 'src').rglob('*'):
    if path.suffix not in {'.ts', '.tsx'} or path.as_posix().endswith('src/data/activities.ts'):
        continue
    text = path.read_text(encoding='utf-8')
    for label, activity_id in LABEL_TO_ID.items():
        text = text.replace(f"'{label}'", f"'{activity_id}'")
    path.write_text(text, encoding='utf-8')

replace_exact(
    'src/types/scene.ts',
    "import type { SubSceneId } from '../data/subScenes';",
    "import type { SubSceneId } from '../data/subScenes';\nimport type { ActivityId } from '../data/activities';"
)
replace_exact('src/types/scene.ts', '  activity: string;', "  activity: ActivityId | '';")

replace_exact(
    'src/data/sceneOptions.ts',
    "import type { SubSceneId } from './subScenes';",
    "import type { SubSceneId } from './subScenes';\nimport type { ActivityId } from './activities';"
)
scene_options = read('src/data/sceneOptions.ts')
scene_options, cast_count = re.subn(
    r'(activities:\s*\[[^\]]*\])(?!\s+as ActivityId\[\])',
    r'\1 as ActivityId[]',
    scene_options
)
if cast_count != 6:
    raise RuntimeError(f'src/data/sceneOptions.ts: expected 6 activity arrays, found {cast_count}')
write('src/data/sceneOptions.ts', scene_options)

replace_exact(
    'src/components/ActiveSceneBasicsSection.tsx',
    "import { getSubSceneLabel, type SubSceneId } from '../data/subScenes';",
    "import { getSubSceneLabel, type SubSceneId } from '../data/subScenes';\nimport { getActivityLabel, type ActivityId } from '../data/activities';"
)
replace_exact(
    'src/components/ActiveSceneBasicsSection.tsx',
    '  onActivityChange: (activity: string) => void;',
    '  onActivityChange: (activity: ActivityId) => void;'
)
replace_exact(
    'src/components/ActiveSceneBasicsSection.tsx',
    '              {activity}',
    '              {getActivityLabel(activity)}'
)

replace_exact(
    'src/components/BottomActionBar.tsx',
    'interface BottomActionBarProps {',
    "import { getActivityLabel, type ActivityId } from '../data/activities';\n\ninterface BottomActionBarProps {"
)
replace_exact('src/components/BottomActionBar.tsx', '  activity: string;', "  activity: ActivityId | '';")
replace_exact(
    'src/components/BottomActionBar.tsx',
    '            {sceneLabel} • {activity}',
    '            {sceneLabel} • {getActivityLabel(activity)}'
)

replace_exact(
    'src/engine/semanticScene.ts',
    "import { OUTFITS } from '../data/outfits';",
    "import { OUTFITS } from '../data/outfits';\nimport { getActivityLabel } from '../data/activities';"
)
replace_exact(
    'src/engine/semanticScene.ts',
    "  const lightingLabel = getLightingProfile(state.lightingMode).labelAR || 'إضاءة متاحة';",
    "  const lightingLabel = getLightingProfile(state.lightingMode).labelAR || 'إضاءة متاحة';\n  const activityLabel = getActivityLabel(state.activity);"
)
replace_exact(
    'src/engine/semanticScene.ts',
    'Activity: ${state.activity}.',
    'Activity: ${activityLabel}.'
)

lighting = read('src/engine/lighting.ts')
lighting = lighting.replace(
    "import type { SubSceneId } from '../data/subScenes';",
    "import type { SubSceneId } from '../data/subScenes';\nimport type { ActivityId } from '../data/activities';"
)
lighting = lighting.replace('  activity?: string;', "  activity?: ActivityId | '';")
lighting = lighting.replace("activity.includes('الهاتف') || activity.includes('using-phone')", "activity === 'using-phone'")
lighting = lighting.replace("activity.includes('قهوة')", "activity === 'drinking-coffee'")
if 'activity.includes(' in lighting:
    raise RuntimeError('src/engine/lighting.ts: residual activity.includes() logic remains')
write('src/engine/lighting.ts', lighting)

replace_exact(
    'src/engine/rules.ts',
    "import type { SubSceneId } from '../data/subScenes';",
    "import type { SubSceneId } from '../data/subScenes';\nimport type { ActivityId } from '../data/activities';"
)
replace_exact('src/engine/rules.ts', '  activities: readonly string[];', '  activities: readonly ActivityId[];')
replace_exact('src/engine/rules.ts', '  activity: string;', "  activity: ActivityId | '';")
replace_exact(
    'src/engine/rules.ts',
    "  if (!family.activities.includes(next.activity)) next.activity = firstOr(family.activities, '');",
    "  if (!next.activity || !family.activities.includes(next.activity)) next.activity = firstOr(family.activities, '');"
)

replace_exact(
    'src/state/sceneState.ts',
    "import { resolveSubSceneId } from '../data/subScenes';",
    "import { resolveSubSceneId } from '../data/subScenes';\nimport { resolveActivityId } from '../data/activities';"
)
replace_exact(
    'src/state/sceneState.ts',
    '  next.subScene = resolveSubSceneId(raw.subScene ?? next.subScene);\n  next.lightingMode = resolveLightingKind(raw.lightingMode ?? next.lightingMode);',
    '  next.subScene = resolveSubSceneId(raw.subScene ?? next.subScene);\n  next.activity = resolveActivityId(raw.activity ?? next.activity);\n  next.lightingMode = resolveLightingKind(raw.lightingMode ?? next.lightingMode);'
)

replace_exact(
    'src/state/sceneState.test.ts',
    "  it('falls back from invalid enum-like values', () => {",
    "  it('migrates legacy Arabic activity labels to stable machine ids', () => {\n    expect(normalizeSceneState({ sceneFamily: 'bedroom', activity: 'يستخدم الهاتف' }).activity).toBe('using-phone');\n    expect(normalizeSceneState({ sceneFamily: 'car', activity: 'خلف المقود والسيارة متوقفة' }).activity).toBe('parked-behind-wheel');\n  });\n\n  it('falls back from invalid enum-like values', () => {"
)

for path in (ROOT / 'src').rglob('*'):
    if path.suffix not in {'.ts', '.tsx'}:
        continue
    if path.as_posix().endswith('src/data/activities.ts') or path.as_posix().endswith('src/state/sceneState.test.ts'):
        continue
    text = path.read_text(encoding='utf-8')
    for label in LABEL_TO_ID:
        if f"'{label}'" in text:
            raise RuntimeError(f'{path}: legacy activity label remains as a domain literal: {label}')

print('Activity stable-id migration completed successfully.')
