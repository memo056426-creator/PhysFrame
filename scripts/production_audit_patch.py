from pathlib import Path
import re

path = Path('src/App.tsx')
text = path.read_text()

# This patch runs after the historical feature patches and consolidates their behavior
# into a coherent, production-oriented source file.

# -----------------------------------------------------------------------------
# 1) Rules engine: replace the whole resolver with one deterministic, idempotent pass.
#    Crucially, it never writes outfitId or hairStyle.
# -----------------------------------------------------------------------------
resolver_pattern = re.compile(
    r"const resolveConflicts = \(state: SceneState\): SceneState => \{.*?\n\};\n\nconst deriveRealismState",
    re.S,
)
resolver_replacement = r"""const resolveConflicts = (state: SceneState): SceneState => {
  const next: SceneState = { ...state };
  if (!next.sceneFamily) return next;

  const family = SCENE_FAMILIES[next.sceneFamily];
  const allowedLighting = family.allowedLighting;

  // Keep scene-dependent values valid without touching manual appearance choices.
  if (!family.subScenes.includes(next.subScene)) next.subScene = family.subScenes[0] ?? '';
  if (!family.activities.includes(next.activity)) next.activity = family.activities[0] ?? '';
  if (!family.poses.includes(next.pose)) next.pose = family.poses[0] ?? '';
  if (!family.environmentRealism.includes(next.environmentRealism)) next.environmentRealism = family.environmentRealism[0] ?? '';
  if (!allowedLighting.includes(next.lightingMode)) next.lightingMode = allowedLighting[0] ?? '';

  // Mirror selfies only make sense in scene families that explicitly contain plausible mirrors.
  if (next.captureType === 'mirror-selfie' && !['bedroom', 'gym', 'living-room'].includes(next.sceneFamily)) {
    next.captureType = 'front-selfie';
  }

  const isOutdoor = next.sceneFamily === 'saudi-outdoor'
    || (next.sceneFamily === 'military-base' && next.subScene.includes('مواقف'))
    || (next.sceneFamily === 'car' && next.subScene.includes('بجانب'));

  if (!isOutdoor && (next.atmosphericCondition === 'breezy' || next.atmosphericCondition === 'dusty-haze')) {
    next.atmosphericCondition = 'neutral';
  }

  // Explicit single-source phone-screen lighting is a dark/night setup.
  if (next.lightingMode === 'إضاءة شاشة الهاتف فقط') {
    next.timeOfDay = 'night';
  }

  const isDay = ['morning', 'midday', 'afternoon'].includes(next.timeOfDay);
  const isNight = next.timeOfDay === 'night';
  const isExplicitDaylight = /نهاري|شمس الظهر|ساعة ذهبية|شروق|غروب/.test(next.lightingMode);
  const isExplicitNightLight = /إنارة شارع|نيون|ليلية/.test(next.lightingMode);

  if (isNight && isExplicitDaylight) {
    next.lightingMode = allowedLighting.find(mode => !/نهاري|شمس الظهر|ساعة ذهبية|شروق|غروب/.test(mode))
      ?? allowedLighting[0]
      ?? '';
  } else if (isDay && isExplicitNightLight) {
    next.lightingMode = allowedLighting.find(mode => /نهاري|شمس|فلورسنت|سقف|النادي|داخل السيارة/.test(mode))
      ?? allowedLighting[0]
      ?? '';
  }

  if (next.timeOfDay === 'sunset' && next.lightingMode.includes('شمس الظهر')) {
    next.lightingMode = allowedLighting.find(mode => /ذهبية|غروب|شروق/.test(mode))
      ?? allowedLighting.find(mode => /نهاري/.test(mode))
      ?? allowedLighting[0]
      ?? '';
  }

  if ((next.timeOfDay === 'morning' || next.timeOfDay === 'midday') && /ذهبية|غروب/.test(next.lightingMode)) {
    next.lightingMode = allowedLighting.find(mode => /نهاري|شمس الظهر/.test(mode))
      ?? allowedLighting[0]
      ?? '';
  }

  // Through-glass candid shots from outside the cabin need glass/reflection physics.
  if (next.sceneFamily === 'car'
      && next.captureType === 'third-person-candid'
      && next.subScene === 'داخل السيارة'
      && next.foregroundObstruction === 'clean') {
    next.foregroundObstruction = 'through-glass';
  }

  // An eyewear-specific hand action cannot survive when eyewear is disabled.
  if (!next.hasGlasses && next.handProp === 'adjusting-glasses') next.handProp = 'none';

  // Intentionally never mutate next.outfitId or next.hairStyle here.
  // Direct flash is valid in daylight and at night, so it is not auto-disabled.
  return next;
};

const deriveRealismState"""
text, resolver_count = resolver_pattern.subn(resolver_replacement, text, count=1)
if resolver_count != 1:
    raise SystemExit(f'Could not replace resolveConflicts cleanly: {resolver_count}')

# -----------------------------------------------------------------------------
# 2) Hyper-realism: raw skin, T-zone oil, imperfect eyes, fabric lint/dust/wrinkles.
# -----------------------------------------------------------------------------
base_shadow = "  derived.shadowBehavior += ', deep ambient occlusion in clothing folds and under jawline, hard physically accurate contact shadow grounding the subject';"
extra_texture = """
  derived.skinResponse += ', natural uneven T-zone oiliness with slightly stronger unpowdered sheen on the forehead and nose than on the cheeks';
  derived.fabricBehavior.push(
    'microscopic lint fibers visible only where light catches the fabric',
    'a few sparse natural dust specks rather than a digitally spotless surface',
    'non-uniform physically plausible micro-wrinkles and pressure creases instead of perfectly smoothed cloth'
  );
"""
if 'natural uneven T-zone oiliness' not in text:
    if base_shadow not in text:
        raise SystemExit('Could not locate base shadow marker for texture audit')
    text = text.replace(base_shadow, base_shadow + extra_texture, 1)

# Make the selected expression explicitly carry the imperfect-eye realism instead of
# leaving it only in a texture paragraph.
old_expression = "    expression: expression?.prompt || 'neutral',"
new_expression = "    expression: `${expression?.prompt || 'neutral'}, slightly realistic tired eyes, natural imperfect eyelashes that clump together randomly, subtle natural dark circles under eyes, unglamorous real-world facial expression`,"
if old_expression in text:
    text = text.replace(old_expression, new_expression, 1)
elif 'natural imperfect eyelashes that clump together randomly' not in text:
    raise SystemExit('Could not locate semantic expression output')

# Avoid a hairstyle physics phrase that could imply inventing a new hairline.
text = text.replace(
    "physics: 'tight fade on sides, minimal volume on top, sharp natural hairline'",
    "physics: 'tight fade on sides, minimal volume on top, preserving the exact biological hairline and scalp visibility from the reference'"
)

# -----------------------------------------------------------------------------
# 3) Negative prompt: centralized, aggressive anti-AI / anti-symmetry constraints.
# -----------------------------------------------------------------------------
negative_fn = re.compile(
    r"const buildNegativeConstraints = \(state: SceneState\): string\[\] => \{.*?\n\};",
    re.S,
)
negative_replacement = r"""const buildNegativeConstraints = (state: SceneState): string[] => {
  const crowdConstraints = state.backgroundDynamics === 'empty'
    ? ['background people', 'crowd', 'background people staring at camera', 'posed background characters']
    : ['background people staring at camera', 'posed background characters', 'generic stock-photo crowd', 'duplicated people', 'cloned faces'];

  return Array.from(new Set([
    ...crowdConstraints,
    'altered hair volume',
    'added hair density',
    'filled bald spots',
    'wig',
    'unnaturally thick hair',
    'altered hairline',
    'plastic skin',
    'waxy skin',
    'airbrushed',
    'digital smoothing',
    'beauty filter',
    'flawless skin',
    'makeup',
    'glass skin',
    'cinematic skin',
    'perfect eyelashes',
    'glowing eyes',
    'doll-like appearance',
    'photorealistic render look',
    'porcelain skin',
    'perfect facial symmetry',
    'artificial bilateral facial symmetry',
    'symmetrical AI artifacts',
    'over-retouched face',
    'beauty-mode eye enlargement',
    'digitally spotless clothing',
    'impossibly perfect fabric'
  ]));
};"""
text, neg_count = negative_fn.subn(negative_replacement, text, count=1)
if neg_count != 1:
    raise SystemExit(f'Could not replace buildNegativeConstraints cleanly: {neg_count}')

# -----------------------------------------------------------------------------
# 4) Prompt structure: include expression explicitly, remove flash duplication,
#    deduplicate constraints, and use a human-readable environment name.
# -----------------------------------------------------------------------------
text = text.replace(
    "let cameraRealism = `Style: ${state.realismStyle.replace('-', ' ')}. ${derived.lensEffects}. ${derived.flashEffects} Avoid CGI glossy look.`;",
    "let cameraRealism = `Style: ${state.realismStyle.replace('-', ' ')}. ${derived.lensEffects}. Avoid CGI glossy look.`;"
)
text = text.replace(
    "cameraRealism = `Style: Absolute raw hyper-realism. Unedited, unfiltered mobile capture. ${derived.lensEffects}. ${derived.flashEffects} Designed to mimic raw physical photography perfectly.`;",
    "cameraRealism = `Style: Absolute raw hyper-realism. Unedited, unfiltered mobile capture. ${derived.lensEffects}. Preserve believable sensor limitations and ordinary handheld imperfections.`;"
)
text = text.replace(
    "styleConstraints: [...derived.realismConstraints, ...backgroundDynamics.constraints].join('. '),",
    "styleConstraints: Array.from(new Set([...derived.realismConstraints, ...backgroundDynamics.constraints])).join('. '),"
)
text = text.replace(
    "visibleEnvironment: `Location: Ordinary realistic ${state.sceneFamily} in Saudi Arabia (if applicable). Visible elements: ${derived.visibleBackgroundElements.join(', ')}. No iconic landmarks. Environment state: ${state.environmentRealism}.`,",
    "visibleEnvironment: `Location: ordinary realistic ${SCENE_FAMILIES[state.sceneFamily!].labelAR} setting. Visible elements: ${derived.visibleBackgroundElements.join(', ')}. No iconic landmarks. Environment state: ${state.environmentRealism}.`,"
)

texture_block = "  const textureBlock = `TEXTURE DETAILS: ${semantic.skinResponse}. Hair: ${semantic.hair}. Hand prop: ${semantic.handProp}.`;"
if texture_block in text and 'EXPRESSION:' not in text[text.find('const buildPromptText'):text.find('const DEFAULT_STATE')]:
    text = text.replace(
        texture_block,
        "  const textureBlock = `TEXTURE DETAILS: ${semantic.skinResponse}. Hair: ${semantic.hair}. Expression: ${semantic.expression}. Hand prop: ${semantic.handProp}.`;",
        1,
    )

# -----------------------------------------------------------------------------
# 5) Manual appearance invariants: presets/random composition must preserve both
#    outfit and hairstyle. Scene selection is already patched to preserve outfit.
# -----------------------------------------------------------------------------
text = text.replace(
    "const handleVibePreset = (preset: VibePreset) => setState({ ...state, ...preset.state, outfitId: state.outfitId });",
    "const handleVibePreset = (preset: VibePreset) => setState({ ...state, ...preset.state, outfitId: state.outfitId, hairStyle: state.hairStyle });"
)
# Remove the random-composition hairstyle override if still present.
text = text.replace(", hairStyle: 'h1'", "")

# -----------------------------------------------------------------------------
# 6) Runtime state hygiene / persistence. Normalize stored state and presets, and
#    stop pretending a reference image exists before IndexedDB confirms it.
# -----------------------------------------------------------------------------
# Default reference image should be absent until IndexedDB actually loads one.
text = text.replace("referenceImageId: '1000236308.png'", "referenceImageId: null")
text = text.replace("const [imageUrl, setImageUrl] = useState<string | null>('1000236308.png');", "const [imageUrl, setImageUrl] = useState<string | null>(null);")
text = text.replace("const [hasReference, setHasReference] = useState<boolean>(true);", "const [hasReference, setHasReference] = useState<boolean>(false);")

# Insert a robust normalizer after DEFAULT_STATE if not already present.
if 'const normalizeSceneState = (candidate: unknown): SceneState =>' not in text:
    default_end = re.search(r"const DEFAULT_STATE: SceneState = \{.*?\n\};", text, re.S)
    if not default_end:
        raise SystemExit('DEFAULT_STATE block not found')
    normalizer = r"""

const normalizeSceneState = (candidate: unknown): SceneState => {
  const raw = candidate && typeof candidate === 'object' ? { ...(candidate as Partial<SceneState> & Record<string, unknown>) } : {};

  if (raw.backgroundDynamics === 'empty-still') raw.backgroundDynamics = 'empty';
  if (raw.backgroundDynamics === 'casual-indifferent') raw.backgroundDynamics = 'casual';
  if (raw.backgroundDynamics === 'busy-motion') raw.backgroundDynamics = 'busy';

  const next: SceneState = { ...DEFAULT_STATE, ...(raw as Partial<SceneState>) };

  const sceneIds: SceneFamilyId[] = ['bedroom', 'living-room', 'saudi-outdoor', 'gym', 'car', 'military-base'];
  const captureTypes: CaptureType[] = ['front-selfie', 'mirror-selfie', 'third-person-candid'];
  const framings: Framing[] = ['head-shoulders', 'chest-up', 'half-body'];
  const angles: CameraAngle[] = ['eye-level', 'slightly-high', 'slightly-low', 'slightly-off-center'];
  const times: TimeOfDay[] = ['morning', 'midday', 'afternoon', 'sunset', 'night'];
  const realismStyles: RealismStyle[] = ['raw-candid', 'cinematic-realism', 'anti-ai-raw'];
  const backgrounds: BackgroundDynamics[] = ['empty', 'casual', 'busy'];
  const framingImperfections: FramingImperfection[] = ['perfect', 'dutch-angle', 'awkward-crop'];

  if (next.sceneFamily && !sceneIds.includes(next.sceneFamily)) next.sceneFamily = null;
  if (!captureTypes.includes(next.captureType)) next.captureType = DEFAULT_STATE.captureType;
  if (!framings.includes(next.framing)) next.framing = DEFAULT_STATE.framing;
  if (!angles.includes(next.cameraAngle)) next.cameraAngle = DEFAULT_STATE.cameraAngle;
  if (!times.includes(next.timeOfDay)) next.timeOfDay = DEFAULT_STATE.timeOfDay;
  if (!realismStyles.includes(next.realismStyle)) next.realismStyle = DEFAULT_STATE.realismStyle;
  if (!backgrounds.includes(next.backgroundDynamics)) next.backgroundDynamics = DEFAULT_STATE.backgroundDynamics;
  if (!framingImperfections.includes(next.framingImperfection)) next.framingImperfection = DEFAULT_STATE.framingImperfection;

  next.hasGlasses = Boolean(next.hasGlasses);
  next.useDigitalZoom = Boolean(next.useDigitalZoom);

  if (!OUTFITS.some(item => item.id === next.outfitId)) next.outfitId = DEFAULT_STATE.outfitId;
  if (!HAIRSTYLES.some(item => item.id === next.hairStyle)) next.hairStyle = DEFAULT_STATE.hairStyle;
  if (!EXPRESSIONS.some(item => item.id === next.expression)) next.expression = DEFAULT_STATE.expression;

  return resolveConflicts(next);
};
"""
    pos = default_end.end()
    text = text[:pos] + normalizer + text[pos:]

# Replace ad-hoc current-state migration with the normalizer.
load_state_pattern = re.compile(
    r"if \(savedState\) \{\n\s*const parsedState = JSON\.parse\(savedState\);.*?setState\(\{ \.\.\.DEFAULT_STATE, \.\.\.parsedState \}\);\n\s*\}",
    re.S,
)
text, load_count = load_state_pattern.subn("if (savedState) setState(normalizeSceneState(JSON.parse(savedState)));", text, count=1)
if load_count == 0:
    # Accept the older one-line form if the feature migration has not rewritten it.
    text = text.replace(
        "if (savedState) setState({ ...DEFAULT_STATE, ...JSON.parse(savedState) });",
        "if (savedState) setState(normalizeSceneState(JSON.parse(savedState)));",
        1,
    )

# Normalize saved presets from storage rather than trusting arbitrary stale objects.
text = text.replace(
    "if (savedPresets) setPresets(JSON.parse(savedPresets));",
    "if (savedPresets) {\n          const parsedPresets = JSON.parse(savedPresets);\n          if (Array.isArray(parsedPresets)) {\n            setPresets(parsedPresets\n              .filter((preset): preset is SavedPreset => Boolean(preset && typeof preset === 'object' && 'state' in preset))\n              .map(preset => ({ ...preset, state: normalizeSceneState(preset.state) })));\n          }\n        }"
)

# localStorage writes can fail in restricted/private browser contexts; keep the app alive.
text = text.replace(
    "useEffect(() => { if (isLoaded) localStorage.setItem('physframe_current_state', JSON.stringify(state)); }, [state, isLoaded]);",
    "useEffect(() => {\n    if (!isLoaded) return;\n    try { localStorage.setItem('physframe_current_state', JSON.stringify(state)); }\n    catch (error) { console.warn('Could not persist PhysFrame state', error); }\n  }, [state, isLoaded]);"
)

# Keep conflict reconciliation dependencies complete and bounded.
effect_pattern = re.compile(
    r"useEffect\(\(\) => \{\n\s*if \(state\.sceneFamily\) \{\n\s*const resolved = resolveConflicts\(state\);\n\s*if \(JSON\.stringify\(resolved\) !== JSON\.stringify\(state\)\) setState\(resolved\);\n\s*\}\n\s*\}, \[[^\]]*\]\);",
    re.S,
)
effect_replacement = """useEffect(() => {
    if (!state.sceneFamily) return;
    const resolved = resolveConflicts(state);
    if (JSON.stringify(resolved) !== JSON.stringify(state)) setState(resolved);
  }, [state.sceneFamily, state.subScene, state.activity, state.pose, state.lightingMode, state.timeOfDay, state.captureType, state.foregroundObstruction, state.flashMode, state.atmosphericCondition, state.hasGlasses, state.handProp]);"""
text, effect_count = effect_pattern.subn(effect_replacement, text, count=1)
if effect_count != 1:
    raise SystemExit(f'Could not update conflict effect dependencies: {effect_count}')

# IndexedDB upload/delete should not crash the UI if browser storage is unavailable.
upload_pattern = re.compile(r"const handleImageUpload = async \(e: React\.ChangeEvent<HTMLInputElement>\) => \{.*?\n  \};", re.S)
upload_replacement = r"""const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await saveImageToDB(file);
    } catch (error) {
      console.warn('Could not persist reference image in IndexedDB; using session preview only.', error);
    }

    if (imageUrl?.startsWith('blob:')) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));
    setHasReference(true);
    setState(prev => ({ ...prev, referenceImageId: file.name }));
  };"""
text, upload_count = upload_pattern.subn(upload_replacement, text, count=1)
if upload_count != 1:
    raise SystemExit(f'Could not replace image upload handler: {upload_count}')

delete_pattern = re.compile(r"const handleImageDelete = async \(\) => \{.*?\n  \};", re.S)
delete_replacement = r"""const handleImageDelete = async () => {
    try {
      await deleteImageFromDB();
    } catch (error) {
      console.warn('Could not remove reference image from IndexedDB.', error);
    }

    if (imageUrl?.startsWith('blob:')) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setHasReference(false);
    setState(prev => ({ ...prev, referenceImageId: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };"""
text, delete_count = delete_pattern.subn(delete_replacement, text, count=1)
if delete_count != 1:
    raise SystemExit(f'Could not replace image delete handler: {delete_count}')

# Hide eyewear-only hand action when glasses are disabled, avoiding a UI -> resolver bounce.
text = text.replace(
    "{HAND_PROPS.map(p => <option key={p.id} value={p.id}>{p.labelAR}</option>)}",
    "{HAND_PROPS.filter(p => state.hasGlasses || p.id !== 'adjusting-glasses').map(p => <option key={p.id} value={p.id}>{p.labelAR}</option>)}"
)

# -----------------------------------------------------------------------------
# 7) Audit assertions. Fail CI if any of the key invariants regress.
# -----------------------------------------------------------------------------
checks = {
    'new background state': "type BackgroundDynamics = 'empty' | 'casual' | 'busy';",
    'glasses state': 'hasGlasses: boolean;',
    'framing imperfection state': 'framingImperfection: FramingImperfection;',
    'digital zoom state': 'useDigitalZoom: boolean;',
    'manual hair lock': 'CRITICAL: Apply the selected hairstyle',
    'negative builder': 'const buildNegativeConstraints = (state: SceneState): string[] =>',
    'anti smoothing': 'ZERO digital skin smoothing',
    'T-zone': 'natural uneven T-zone oiliness',
    'selfie anatomy': 'asymmetrical shoulder elevation',
    'digital zoom artifacts': 'smartphone digital zoom artifacts',
    'timeless outfits': "id: 'timeless15'",
    'all outfits in dropdown': '{OUTFITS.map(o => <option',
    'reference toggle': 'هل الشخص يرتدي نظارة؟',
}
for label, needle in checks.items():
    if needle not in text:
        raise SystemExit(f'Audit invariant missing: {label}')

resolver_text = re.search(r"const resolveConflicts = \(state: SceneState\): SceneState => \{(.*?)\n\};", text, re.S)
if not resolver_text:
    raise SystemExit('resolveConflicts missing after audit patch')
resolver_body = resolver_text.group(1)
if 'hairStyle =' in resolver_body or 'outfitId =' in resolver_body:
    raise SystemExit('Manual hair/outfit invariant violated inside resolveConflicts')
if "flashMode = 'no-flash'" in resolver_body:
    raise SystemExit('Direct flash is still being automatically disabled')

# Ensure the old category-filtered dropdown is gone.
if 'filteredOutfits' in text:
    raise SystemExit('filteredOutfits is still present')

path.write_text(text)
print('Comprehensive production audit patch applied and invariants verified.')
