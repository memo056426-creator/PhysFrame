from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]

LABEL_TO_ID = {
    'واقف باستقامة': 'standing-upright',
    'جالس خلف المكتب': 'seated-behind-desk',
    'مستند بظهره على مكتب': 'leaning-back-on-desk',
    'واقف بثبات': 'standing-steady',
    'يمشي بخطوات طبيعية': 'walking-natural',
    'مستند على جدار': 'leaning-on-wall',
    'مستند على الجدار': 'leaning-on-the-wall',
    'مستند بظهره على الجدار': 'leaning-back-on-wall',
    'جالس على كرسي': 'seated-on-chair',
    'جالس باسترخاء في المقعد': 'relaxed-in-seat',
    'مستند على المقود': 'leaning-on-steering-wheel',
    'مسترخٍ على الكنبة': 'relaxed-on-sofa',
    'مستند على طاولة': 'leaning-on-table',
    'جالس على حافة السرير': 'seated-on-bed-edge',
    'نصف مستلقٍ': 'semi-reclined',
    'واقف بجانب الأجهزة': 'standing-by-equipment',
    'جالس على مقعد التمرين': 'seated-on-gym-bench',
    'يحمل زجاجة ماء': 'holding-water-bottle',
}


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_exact(path: str, old: str, new: str, expected: int = 1) -> None:
    text = read(path)
    count = text.count(old)
    if count != expected:
        raise RuntimeError(f'{path}: expected {expected} occurrences, found {count}: {old[:140]!r}')
    write(path, text.replace(old, new))


# Replace pose labels used as state/domain values. The pose catalog owns Arabic presentation labels.
for path in (ROOT / 'src').rglob('*'):
    if path.suffix not in {'.ts', '.tsx'} or path.as_posix().endswith('src/data/poses.ts'):
        continue
    text = path.read_text(encoding='utf-8')
    for label, pose_id in LABEL_TO_ID.items():
        text = text.replace(f"'{label}'", f"'{pose_id}'")
    path.write_text(text, encoding='utf-8')

# SceneState owns a typed pose id.
replace_exact(
    'src/types/scene.ts',
    "import type { ActivityId } from '../data/activities';",
    "import type { ActivityId } from '../data/activities';\nimport type { PoseId } from '../data/poses';"
)
replace_exact('src/types/scene.ts', '  pose: string;', "  pose: PoseId | '';")

# Scene-family configuration stores pose ids.
replace_exact(
    'src/data/sceneOptions.ts',
    "import type { ActivityId } from './activities';",
    "import type { ActivityId } from './activities';\nimport type { PoseId } from './poses';"
)
scene_options = read('src/data/sceneOptions.ts')
scene_options, cast_count = re.subn(
    r'(poses:\s*\[[^\]]*\])(?!\s+as PoseId\[\])',
    r'\1 as PoseId[]',
    scene_options
)
if cast_count != 6:
    raise RuntimeError(f'src/data/sceneOptions.ts: expected 6 pose arrays, found {cast_count}')
write('src/data/sceneOptions.ts', scene_options)

# Active-scene UI renders Arabic labels while emitting stable ids.
replace_exact(
    'src/components/ActiveSceneBasicsSection.tsx',
    "import { getActivityLabel, type ActivityId } from '../data/activities';",
    "import { getActivityLabel, type ActivityId } from '../data/activities';\nimport { getPoseLabel, type PoseId } from '../data/poses';"
)
replace_exact(
    'src/components/ActiveSceneBasicsSection.tsx',
    '  onPoseChange: (pose: string) => void;',
    '  onPoseChange: (pose: PoseId) => void;'
)
replace_exact(
    'src/components/ActiveSceneBasicsSection.tsx',
    '          onChange={event => onPoseChange(event.target.value)}',
    '          onChange={event => onPoseChange(event.target.value as PoseId)}'
)
replace_exact(
    'src/components/ActiveSceneBasicsSection.tsx',
    '            <option key={pose} value={pose}>{pose}</option>',
    '            <option key={pose} value={pose}>{getPoseLabel(pose)}</option>'
)

# Semantic prompt resolves Arabic pose text only at the presentation boundary.
replace_exact(
    'src/engine/semanticScene.ts',
    "import { getActivityLabel } from '../data/activities';",
    "import { getActivityLabel } from '../data/activities';\nimport { getPoseLabel } from '../data/poses';"
)
replace_exact(
    'src/engine/semanticScene.ts',
    '  const activityLabel = getActivityLabel(state.activity);',
    '  const activityLabel = getActivityLabel(state.activity);\n  const poseLabel = getPoseLabel(state.pose);'
)
replace_exact(
    'src/engine/semanticScene.ts',
    'poseAndContact: `Pose: ${state.pose}. Activity: ${activityLabel}.',
    'poseAndContact: `Pose: ${poseLabel}. Activity: ${activityLabel}.'
)

# Persistence migrates legacy Arabic pose labels, including saved presets through normalizeSceneState.
replace_exact(
    'src/state/sceneState.ts',
    "import { resolveActivityId } from '../data/activities';",
    "import { resolveActivityId } from '../data/activities';\nimport { resolvePoseId } from '../data/poses';"
)
replace_exact(
    'src/state/sceneState.ts',
    '  next.activity = resolveActivityId(raw.activity ?? next.activity);\n  next.lightingMode = resolveLightingKind(raw.lightingMode ?? next.lightingMode);',
    '  next.activity = resolveActivityId(raw.activity ?? next.activity);\n  next.pose = resolvePoseId(raw.pose ?? next.pose);\n  next.lightingMode = resolveLightingKind(raw.lightingMode ?? next.lightingMode);'
)

# Rule engine carries typed pose ids.
replace_exact(
    'src/engine/rules.ts',
    "import type { ActivityId } from '../data/activities';",
    "import type { ActivityId } from '../data/activities';\nimport type { PoseId } from '../data/poses';"
)
replace_exact('src/engine/rules.ts', '  poses: readonly string[];', '  poses: readonly PoseId[];')
replace_exact('src/engine/rules.ts', '  pose: string;', "  pose: PoseId | '';")
replace_exact(
    'src/engine/rules.ts',
    "  if (!family.poses.includes(next.pose)) next.pose = firstOr(family.poses, '');",
    "  if (!next.pose || !family.poses.includes(next.pose)) next.pose = firstOr(family.poses, '');"
)

# Physical contact rules use typed pose metadata instead of Arabic substring inspection.
physics = read('src/engine/physics.ts')
if not physics.startswith("export type ClothingCondition"):
    raise RuntimeError('src/engine/physics.ts: unexpected header')
physics = "import { getPoseContactKind, type PoseId } from '../data/poses';\n\n" + physics
physics = physics.replace('  pose: string;', "  pose: PoseId | '';", 1)
old_contact = """  if (facts.pose.includes('جالس')) {
    rules.push(rule(
      'contact.seated-weight',
      'contact',
      'hard',
      'natural weight distribution with clothing compressing realistically against the sitting surface and localized fabric bunching at hips and knees'
    ));
  } else if (facts.pose.includes('مستند')) {
    rules.push(rule(
      'contact.leaning-weight',
      'contact',
      'hard',
      'clear physical support point carrying partial body weight with natural fabric tension and stretching at the contact area'
    ));
  }
"""
new_contact = """  const poseContactKind = getPoseContactKind(facts.pose);
  if (poseContactKind === 'seated') {
    rules.push(rule(
      'contact.seated-weight',
      'contact',
      'hard',
      'natural weight distribution with clothing compressing realistically against the sitting surface and localized fabric bunching at hips and knees'
    ));
  } else if (poseContactKind === 'leaning') {
    rules.push(rule(
      'contact.leaning-weight',
      'contact',
      'hard',
      'clear physical support point carrying partial body weight with natural fabric tension and stretching at the contact area'
    ));
  }
"""
if physics.count(old_contact) != 1:
    raise RuntimeError('src/engine/physics.ts: expected Arabic pose contact block once')
physics = physics.replace(old_contact, new_contact)
if 'facts.pose.includes(' in physics:
    raise RuntimeError('src/engine/physics.ts: residual pose substring inference remains')
write('src/engine/physics.ts', physics)

# Regression: legacy persisted Arabic poses migrate to ids.
replace_exact(
    'src/state/sceneState.test.ts',
    "  it('falls back from invalid enum-like values', () => {",
    "  it('migrates legacy Arabic pose labels to stable machine ids', () => {\n    expect(normalizeSceneState({ sceneFamily: 'bedroom', pose: 'جالس على حافة السرير' }).pose).toBe('seated-on-bed-edge');\n    expect(normalizeSceneState({ sceneFamily: 'car', pose: 'مستند على المقود' }).pose).toBe('leaning-on-steering-wheel');\n  });\n\n  it('falls back from invalid enum-like values', () => {"
)

# Regression: semantic prompt must keep human-readable Arabic pose text, not machine ids.
replace_exact(
    'src/engine/semanticScene.test.ts',
    "    expect(semantic.visibleEnvironment).toContain('Visible elements: everyday household items slightly out of focus');",
    "    expect(semantic.visibleEnvironment).toContain('Visible elements: everyday household items slightly out of focus');\n    expect(semantic.poseAndContact).toContain('Pose: واقف بثبات');\n    expect(semantic.poseAndContact).not.toContain('standing-steady');"
)

# Regression: contact physics is now driven by explicit pose metadata.
replace_exact(
    'src/engine/physics.test.ts',
    "  it('does not emit eyewear physics when glasses are disabled', () => {",
    "  it('derives seated and leaning contact physics from pose metadata', () => {\n    const seated = buildPhysicalProfile({\n      hasGlasses: false, clothingCondition: 'crisp', captureType: 'third-person-candid',\n      pose: 'seated-on-bed-edge', handProp: 'none', facialHairState: '3-day-stubble'\n    });\n    const leaning = buildPhysicalProfile({\n      hasGlasses: false, clothingCondition: 'crisp', captureType: 'third-person-candid',\n      pose: 'leaning-on-wall', handProp: 'none', facialHairState: '3-day-stubble'\n    });\n    const standing = buildPhysicalProfile({\n      hasGlasses: false, clothingCondition: 'crisp', captureType: 'third-person-candid',\n      pose: 'standing-steady', handProp: 'none', facialHairState: '3-day-stubble'\n    });\n\n    expect(seated.contactPhysics.join(' ')).toContain('natural weight distribution');\n    expect(leaning.contactPhysics.join(' ')).toContain('clear physical support point');\n    expect(standing.contactPhysics.join(' ')).not.toContain('natural weight distribution');\n    expect(standing.contactPhysics.join(' ')).not.toContain('clear physical support point');\n  });\n\n  it('does not emit eyewear physics when glasses are disabled', () => {"
)

# Domain sanity: full Arabic pose labels remain only in the catalog and explicit display/migration tests.
allowed_label_files = {
    'src/data/poses.ts',
    'src/state/sceneState.test.ts',
    'src/engine/semanticScene.test.ts',
}
for path in (ROOT / 'src').rglob('*'):
    if path.suffix not in {'.ts', '.tsx'}:
        continue
    rel = path.relative_to(ROOT).as_posix()
    if rel in allowed_label_files:
        continue
    text = path.read_text(encoding='utf-8')
    for label in LABEL_TO_ID:
        if f"'{label}'" in text:
            raise RuntimeError(f'{rel}: legacy pose label remains as a domain literal: {label}')

print('Pose stable-id migration completed successfully.')
