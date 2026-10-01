from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]

LABEL_TO_KIND = {
    'إضاءة مكتب فلورسنت': 'office-fluorescent',
    'ضوء نهاري من النافذة': 'window-daylight',
    'إضاءة ممرات متوازية': 'corridor-practical',
    'شمس الظهر': 'midday-sun',
    'ضوء نهاري طبيعي': 'natural-daylight',
    'ساعة ذهبية (شروق/غروب)': 'golden-hour',
    'شمس صباحية جانبية ناعمة': 'morning-side-sun',
    'ظل مفتوح نهاري': 'open-shade',
    'ضوء سماء غائمة منتشر': 'overcast-sky',
    'ارتداد ضوء نهاري من جدار فاتح': 'wall-bounce-daylight',
    'ضوء نافذة منتشر عبر ستارة': 'curtain-diffused-daylight',
    'شمس عصر جانبية': 'afternoon-side-sun',
    'الشفق الأزرق بعد الغروب': 'blue-hour',
    'إنارة شارع دافئة': 'warm-street',
    'مصباح شارع LED أبيض': 'cool-street-led',
    'إنارة نيون تجارية متناثرة': 'commercial-neon',
    'توهج واجهة متجر أو مقهى': 'storefront-spill',
    'إضاءة موقف سيارات علوية': 'parking-lot-night',
    'إضاءة أمنية خارجية باردة': 'security-flood',
    'إضاءة داخل السيارة': 'vehicle-interior',
    'ضوء نهاري عبر زجاج السيارة': 'vehicle-day-through-glass',
    'إضاءة الشارع عبر زجاج السيارة': 'street-through-glass',
    'إضاءة عدادات السيارة الخافتة': 'dashboard-glow',
    'إضاءة شاشة الهاتف فقط': 'phone-screen',
    'إضاءة سقف': 'ceiling-practical',
    'إضاءة سقف منزلية دافئة': 'warm-ceiling-practical',
    'إنارة ليلية مختلطة': 'mixed-night',
    'إضاءة أباجورة دافئة': 'warm-lamp',
    'ضوء ممر دافئ من الباب': 'doorway-spill',
    'وهج تلفاز خافت': 'tv-spill',
    'إضاءة النادي الرياضي': 'gym-practical',
    'مصابيح LED بيضاء للنادي': 'gym-led-cool',
}


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_exact(path: str, old: str, new: str, expected: int = 1) -> None:
    text = read(path)
    count = text.count(old)
    if count != expected:
        raise RuntimeError(f'{path}: expected {expected} occurrences, found {count}: {old[:80]!r}')
    write(path, text.replace(old, new))


def migrate_lighting_properties(path: Path) -> None:
    text = path.read_text(encoding='utf-8')

    def property_repl(match: re.Match[str]) -> str:
        label = match.group(1)
        return f"lightingMode: '{LABEL_TO_KIND.get(label, label)}'"

    text = re.sub(r"lightingMode:\s*'([^']*)'", property_repl, text)

    def allowed_repl(match: re.Match[str]) -> str:
        body = match.group(1)
        for label, kind in LABEL_TO_KIND.items():
            body = body.replace(f"'{label}'", f"'{kind}'")
        return f'allowedLighting: [{body}]'

    text = re.sub(r'allowedLighting:\s*\[([^\]]*)\]', allowed_repl, text)
    path.write_text(text, encoding='utf-8')


# First migrate state/config/test property literals without touching Arabic display labels.
for path in (ROOT / 'src').rglob('*'):
    if path.suffix in {'.ts', '.tsx'}:
        migrate_lighting_properties(path)

# Scene state owns a stable machine lighting id, with legacy Arabic values migrated at load time.
replace_exact(
    'src/types/scene.ts',
    "import type { GroupSelfieCompanionCount } from '../engine/groupSelfie';",
    "import type { GroupSelfieCompanionCount } from '../engine/groupSelfie';\nimport type { LightingKind } from '../engine/lighting';"
)
replace_exact('src/types/scene.ts', '  lightingMode: string;', '  lightingMode: LightingKind;')

replace_exact(
    'src/state/sceneState.ts',
    "import { resolveSceneConflicts } from '../engine/rules';",
    "import { resolveLightingKind } from '../engine/lighting';\nimport { resolveSceneConflicts } from '../engine/rules';"
)
replace_exact('src/state/sceneState.ts', "  lightingMode: '',", "  lightingMode: 'unknown',")
replace_exact(
    'src/state/sceneState.ts',
    "  const next: SceneState = { ...DEFAULT_STATE, ...(raw as Partial<SceneState>) };",
    "  const next: SceneState = { ...DEFAULT_STATE, ...(raw as Partial<SceneState>) };\n  next.lightingMode = resolveLightingKind(raw.lightingMode ?? next.lightingMode);"
)

# Give scene family fallback arrays a contextual machine-id type.
replace_exact(
    'src/data/sceneOptions.ts',
    "import type { SceneState } from '../types/scene';",
    "import type { LightingKind } from '../engine/lighting';\nimport type { SceneState } from '../types/scene';"
)
scene_options = read('src/data/sceneOptions.ts')
scene_options, cast_count = re.subn(r'(allowedLighting:\s*\[[^\]]*\])', r'\1 as LightingKind[]', scene_options)
if cast_count != 6:
    raise RuntimeError(f'src/data/sceneOptions.ts: expected 6 allowedLighting arrays, found {cast_count}')
write('src/data/sceneOptions.ts', scene_options)

# Lighting catalog is keyed by stable LightingKind, while Arabic labels remain presentation metadata.
replace_exact(
    'src/engine/lighting.ts',
    "export interface LightingSuggestion {\n  labelAR: string;",
    "export interface LightingSuggestion {\n  kind: LightingKind;\n  labelAR: string;"
)
replace_exact(
    'src/engine/lighting.ts',
    "export const LIGHTING_PROFILES: Readonly<Record<string, LightingProfile>> = Object.freeze(\n  Object.fromEntries(profiles.map(profile => [profile.labelAR, profile]))\n);",
    "export const LIGHTING_PROFILES: Readonly<Record<string, LightingProfile>> = Object.freeze(\n  Object.fromEntries(profiles.map(profile => [profile.kind, profile]))\n);\n\nconst LIGHTING_KIND_BY_LABEL = new Map<string, LightingKind>(\n  profiles.map(profile => [profile.labelAR, profile.kind])\n);"
)
replace_exact(
    'src/engine/lighting.ts',
    "export const getLightingProfile = (label: string): LightingProfile =>\n  LIGHTING_PROFILES[label] ?? { ...UNKNOWN_PROFILE, labelAR: label };",
    "export const isLightingKind = (value: unknown): value is LightingKind =>\n  typeof value === 'string' &&\n  (value === 'unknown' || Object.prototype.hasOwnProperty.call(LIGHTING_PROFILES, value));\n\nexport const resolveLightingKind = (value: unknown): LightingKind => {\n  if (isLightingKind(value)) return value;\n  return typeof value === 'string' ? (LIGHTING_KIND_BY_LABEL.get(value) ?? 'unknown') : 'unknown';\n};\n\nexport const getLightingProfile = (kind: LightingKind): LightingProfile =>\n  kind === 'unknown' ? UNKNOWN_PROFILE : (LIGHTING_PROFILES[kind] ?? UNKNOWN_PROFILE);\n\nexport const getLightingLabel = (kind: LightingKind): string => getLightingProfile(kind).labelAR;"
)
replace_exact(
    'src/engine/lighting.ts',
    "export const getSceneLightingLabels = (sceneFamily: SceneFamilyId, subScene: string): string[] =>\n  getSceneLightingProfiles(sceneFamily, subScene).map(profile => profile.labelAR);",
    "export const getSceneLightingKinds = (sceneFamily: SceneFamilyId, subScene: string): LightingKind[] =>\n  getSceneLightingProfiles(sceneFamily, subScene).map(profile => profile.kind);\n\nexport const getSceneLightingLabels = (sceneFamily: SceneFamilyId, subScene: string): string[] =>\n  getSceneLightingProfiles(sceneFamily, subScene).map(profile => profile.labelAR);"
)
replace_exact(
    'src/engine/lighting.ts',
    "    .map(profile => ({\n      labelAR: profile.labelAR,",
    "    .map(profile => ({\n      kind: profile.kind,\n      labelAR: profile.labelAR,"
)
replace_exact('src/engine/lighting.ts', '  lightingMode: string;\n  allowedLighting: readonly string[];', '  lightingMode: LightingKind;\n  allowedLighting: readonly LightingKind[];')
replace_exact('src/engine/lighting.ts', '  lightingMode: string;\n  timeOfDay: EngineTimeOfDay;', '  lightingMode: LightingKind;\n  timeOfDay: EngineTimeOfDay;')
replace_exact(
    'src/engine/lighting.ts',
    "    .map(label => getLightingProfile(label))",
    "    .map(kind => getLightingProfile(kind))"
)
replace_exact(
    'src/engine/lighting.ts',
    "  const fallback = candidates[0] ?? getLightingProfile(allowedLighting[0] ?? lightingMode);\n  const resolvedMode = fallback.labelAR || allowedLighting[0] || lightingMode;",
    "  const fallback = candidates[0] ?? getLightingProfile(allowedLighting[0] ?? lightingMode);\n  const resolvedMode = fallback.kind !== 'unknown' ? fallback.kind : (allowedLighting[0] ?? lightingMode);"
)

# Conflict resolution now works on kinds, not Arabic labels.
replace_exact(
    'src/engine/rules.ts',
    "  getSceneLightingLabels,\n  resolveLightingCompatibility,\n  type EngineTimeOfDay",
    "  getSceneLightingKinds,\n  resolveLightingCompatibility,\n  type EngineTimeOfDay,\n  type LightingKind"
)
replace_exact('src/engine/rules.ts', '  allowedLighting: readonly string[];', '  allowedLighting: readonly LightingKind[];')
replace_exact('src/engine/rules.ts', '  lightingMode: string;', '  lightingMode: LightingKind;')
replace_exact(
    'src/engine/rules.ts',
    '  const sceneAwareLighting = getSceneLightingLabels(next.sceneFamily, next.subScene);',
    '  const sceneAwareLighting = getSceneLightingKinds(next.sceneFamily, next.subScene);'
)

# UI keeps Arabic labels but submits/stores stable kinds.
replace_exact(
    'src/components/LightingSection.tsx',
    "import type { LightingSuggestion } from '../engine/lighting';",
    "import type { LightingKind, LightingSuggestion } from '../engine/lighting';"
)
replace_exact('src/components/LightingSection.tsx', '  onLightingModeChange: (lightingMode: string) => void;', '  onLightingModeChange: (lightingMode: LightingKind) => void;')
replace_exact('src/components/LightingSection.tsx', '                key={suggestion.labelAR}', '                key={suggestion.kind}')
replace_exact('src/components/LightingSection.tsx', '                onClick={() => onLightingModeChange(suggestion.labelAR)}', '                onClick={() => onLightingModeChange(suggestion.kind)}')
replace_exact('src/components/LightingSection.tsx', 'state.lightingMode === suggestion.labelAR', 'state.lightingMode === suggestion.kind')
replace_exact('src/components/LightingSection.tsx', '          onChange={event => onLightingModeChange(event.target.value)}', '          onChange={event => onLightingModeChange(event.target.value as LightingKind)}')
replace_exact('src/components/LightingSection.tsx', '<option key={item.labelAR} value={item.labelAR}>{item.labelAR}</option>', '<option key={item.kind} value={item.kind}>{item.labelAR}</option>')

# Scene orchestration and smart composition select by kind.
replace_exact('src/hooks/useSceneOrchestration.ts', '        item => item.labelAR === current.lightingMode', '        item => item.kind === current.lightingMode')
replace_exact('src/hooks/useSceneOrchestration.ts', ': (allCompatible[0]?.labelAR ?? current.lightingMode)', ': (allCompatible[0]?.kind ?? current.lightingMode)')
replace_exact('src/hooks/useSceneOrchestration.ts', '        lightingMode: suggested?.labelAR ?? current.lightingMode', '        lightingMode: suggested?.kind ?? current.lightingMode')
replace_exact('src/engine/smartComposition.ts', '  const lightingMode = pick(lightingSuggestions.map(item => item.labelAR), rng);', '  const lightingMode = pick(lightingSuggestions.map(item => item.kind), rng);')

# Prompt semantics render the Arabic label, while linting reasons over the machine kind.
replace_exact(
    'src/engine/semanticScene.ts',
    "import { mergeFabricPhysics } from './physics';",
    "import { getLightingProfile } from './lighting';\nimport { mergeFabricPhysics } from './physics';"
)
replace_exact(
    'src/engine/semanticScene.ts',
    "  const groupSelfieProfile = buildGroupSelfieProfile({ enabled: state.groupSelfieEnabled, companionCount: state.groupSelfieCompanionCount, captureType: state.captureType });",
    "  const groupSelfieProfile = buildGroupSelfieProfile({ enabled: state.groupSelfieEnabled, companionCount: state.groupSelfieCompanionCount, captureType: state.captureType });\n  const lightingLabel = getLightingProfile(state.lightingMode).labelAR || 'إضاءة متاحة';"
)
replace_exact('src/engine/semanticScene.ts', 'Lighting source: ${state.lightingMode}.', 'Lighting source: ${lightingLabel}.')

replace_exact(
    'src/engine/promptIR.ts',
    "import { buildVehicleGeometry } from './vehicle';",
    "import type { LightingKind } from './lighting';\nimport { buildVehicleGeometry } from './vehicle';"
)
replace_exact('src/engine/promptIR.ts', '  lightingMode: string;', '  lightingMode: LightingKind;')
replace_exact("src/engine/promptIR.ts", "  if (facts.lightingMode === 'إضاءة شاشة الهاتف فقط') {", "  if (facts.lightingMode === 'phone-screen') {")

# Tests: resolver outputs now assert kinds; labels remain asserted only for display/suggestion behavior.
replace_exact(
    'src/engine/lighting.test.ts',
    '  resolveLightingCompatibility\n} from \'./lighting\';',
    '  resolveLightingCompatibility,\n  resolveLightingKind\n} from \'./lighting\';'
)
replace_exact("src/engine/lighting.test.ts", "expect(result.lightingMode).toBe('إضاءة شاشة الهاتف فقط');", "expect(result.lightingMode).toBe('phone-screen');")
replace_exact("src/engine/lighting.test.ts", "expect(['إضاءة سقف', 'إنارة ليلية مختلطة', 'إضاءة شاشة الهاتف فقط']).toContain(result.lightingMode);", "expect(['ceiling-practical', 'mixed-night', 'phone-screen']).toContain(result.lightingMode);")
replace_exact("src/engine/lighting.test.ts", "expect(result.lightingMode).toBe('ساعة ذهبية (شروق/غروب)');", "expect(result.lightingMode).toBe('golden-hour');")
replace_exact("src/engine/lighting.test.ts", "expect(result.lightingMode).toBe('إضاءة مكتب فلورسنت');", "expect(result.lightingMode).toBe('office-fluorescent');")
replace_exact("src/engine/lighting.test.ts", "const profile = getLightingProfile('إضاءة أباجورة دافئة');", "const profile = getLightingProfile('warm-lamp');")
replace_exact(
    'src/engine/lighting.test.ts',
    "  it('provides explicit physics for all known lighting labels', () => {",
    "  it('migrates legacy Arabic labels to stable machine ids', () => {\n    expect(resolveLightingKind('إضاءة شاشة الهاتف فقط')).toBe('phone-screen');\n    expect(resolveLightingKind('warm-lamp')).toBe('warm-lamp');\n    expect(resolveLightingKind('قيمة قديمة غير معروفة')).toBe('unknown');\n  });\n\n  it('provides explicit physics for all known lighting ids', () => {"
)
replace_exact("src/engine/smartComposition.test.ts", "if (state.lightingMode === 'إضاءة شاشة الهاتف فقط')", "if (state.lightingMode === 'phone-screen')")

# Add a persistence migration regression test.
replace_exact(
    'src/state/sceneState.test.ts',
    "  it('falls back from invalid enum-like values', () => {",
    "  it('migrates legacy Arabic lighting labels to stable machine ids', () => {\n    expect(normalizeSceneState({ lightingMode: 'إضاءة شاشة الهاتف فقط' }).lightingMode).toBe('phone-screen');\n    expect(normalizeSceneState({ lightingMode: 'إضاءة أباجورة دافئة' }).lightingMode).toBe('warm-lamp');\n  });\n\n  it('falls back from invalid enum-like values', () => {"
)

# Sanity checks: domain state/config must not use Arabic lighting strings as identifiers anymore.
for path in (ROOT / 'src').rglob('*'):
    if path.suffix not in {'.ts', '.tsx'}:
        continue
    text = path.read_text(encoding='utf-8')
    for match in re.finditer(r"lightingMode:\s*'([^']*)'", text):
        value = match.group(1)
        if value in LABEL_TO_KIND:
            raise RuntimeError(f'{path}: legacy Arabic lightingMode still present: {value}')
    for match in re.finditer(r'allowedLighting:\s*\[([^\]]*)\]', text):
        body = match.group(1)
        if any(f"'{label}'" in body for label in LABEL_TO_KIND):
            raise RuntimeError(f'{path}: legacy Arabic allowedLighting still present')

print('Lighting stable-id migration completed successfully.')
