from pathlib import Path
import re

path = Path('src/App.tsx')
text = path.read_text(encoding='utf-8')

react_import = "import React, { useState, useEffect, useRef } from 'react';"
engine_imports = """import React, { useState, useEffect, useRef } from 'react';
import { getLightingProfile, resolveLightingCompatibility } from './engine/lighting';
import { buildPromptIR, lintPromptIR, renderPromptIR, type PromptFacts } from './engine/promptIR';"""
if "./engine/lighting" not in text:
    text = text.replace(react_import, engine_imports, 1)

resolver_pattern = re.compile(
    r"const resolveConflicts = \(state: SceneState\): SceneState => \{.*?\n\};\n\nconst deriveRealismState",
    re.S,
)
resolver_replacement = """const resolveConflicts = (state: SceneState): SceneState => {
  const next: SceneState = { ...state };
  if (!next.sceneFamily) return next;

  const family = SCENE_FAMILIES[next.sceneFamily];
  const allowedLighting = family.allowedLighting;

  // Scene-dependent values are normalized, while manual appearance choices remain untouched.
  if (!family.subScenes.includes(next.subScene)) next.subScene = family.subScenes[0] ?? '';
  if (!family.activities.includes(next.activity)) next.activity = family.activities[0] ?? '';
  if (!family.poses.includes(next.pose)) next.pose = family.poses[0] ?? '';
  if (!family.environmentRealism.includes(next.environmentRealism)) next.environmentRealism = family.environmentRealism[0] ?? '';

  // Lighting compatibility is resolved from typed metadata rather than Arabic-label regex matching.
  const lightingResolution = resolveLightingCompatibility({
    lightingMode: next.lightingMode,
    allowedLighting,
    timeOfDay: next.timeOfDay
  });
  next.lightingMode = lightingResolution.lightingMode;
  next.timeOfDay = lightingResolution.timeOfDay;

  // Mirror selfies are only valid in scene families with plausible mirror surfaces.
  if (next.captureType === 'mirror-selfie' && !['bedroom', 'gym', 'living-room'].includes(next.sceneFamily)) {
    next.captureType = 'front-selfie';
  }

  const isOutdoor = next.sceneFamily === 'saudi-outdoor'
    || (next.sceneFamily === 'military-base' && next.subScene.includes('مواقف'))
    || (next.sceneFamily === 'car' && next.subScene.includes('بجانب'));

  if (!isOutdoor && (next.atmosphericCondition === 'breezy' || next.atmosphericCondition === 'dusty-haze')) {
    next.atmosphericCondition = 'neutral';
  }

  if (next.sceneFamily === 'car'
      && next.captureType === 'third-person-candid'
      && next.subScene === 'داخل السيارة'
      && next.foregroundObstruction === 'clean') {
    next.foregroundObstruction = 'through-glass';
  }

  if (!next.hasGlasses && next.handProp === 'adjusting-glasses') next.handProp = 'none';

  // HARD INVARIANT: outfitId and hairStyle are manual user choices and are never mutated here.
  return next;
};

const deriveRealismState"""
text, count = resolver_pattern.subn(resolver_replacement, text, count=1)
if count != 1:
    raise SystemExit(f'Could not replace resolveConflicts: {count}')

# Add typed lighting profile lookup to the realism derivation.
derive_marker = "const deriveRealismState = (state: SceneState): DerivedSceneState => {\n  const derived: DerivedSceneState = {"
if derive_marker not in text:
    raise SystemExit('deriveRealismState marker missing')
text = text.replace(
    derive_marker,
    "const deriveRealismState = (state: SceneState): DerivedSceneState => {\n  const lightingProfile = getLightingProfile(state.lightingMode);\n  const derived: DerivedSceneState = {",
    1,
)

lighting_pattern = re.compile(
    r"  // --- 2\. Flash Mode Logic \(The ultimate AI-breaker\) ---.*?  // --- 4\. Sensor Limitations \(Anti-AI Raw\) ---",
    re.S,
)
lighting_replacement = """  // --- 2. Layered Lighting Engine ---
  // Ambient/practical illumination and capture flash are separate physical layers.
  derived.environmentalLightBehavior = lightingProfile.ambientDescription;
  derived.shadowBehavior = `${lightingProfile.shadowDescription}, deep physically plausible contact occlusion where surfaces meet`;

  if (lightingProfile.kind === 'phone-screen') {
    derived.lensEffects += ', visible low-light sensor grain in dark regions, restrained shadow noise, no artificial room-wide denoising';
    derived.skinResponse += ', localized cool screen reflection strongest on the face and nearest hand with rapid physical falloff';
    if (state.hasGlasses) derived.lensEffects += ', microscopic phone-screen reflection visible in one eyeglass lens when the angle permits';
  } else if (lightingProfile.kind === 'midday-sun') {
    derived.skinResponse += ', slight natural forehead sheen catching direct sun';
    derived.lensEffects += ', limited smartphone highlight recovery and mild chromatic fringing on extreme contrast edges';
    if (state.hasGlasses) derived.shadowBehavior += ', small physically consistent eyeglass-frame shadows on the upper cheeks';
  } else if (lightingProfile.kind === 'golden-hour') {
    derived.skinResponse += ', warm directional edge light with subtle subsurface scattering at the ears where directly backlit';
  } else if (['warm-street', 'commercial-neon', 'street-through-glass', 'mixed-night', 'warm-lamp'].includes(lightingProfile.kind)) {
    derived.lensEffects += ', realistic high-ISO grain in underexposed regions, mild color-temperature drift, restrained computational noise reduction';
    if (state.hasGlasses) derived.lensEffects += ', faint practical-light reflections on the eyeglass lenses following the actual source direction';
  } else if (lightingProfile.kind === 'vehicle-interior') {
    derived.lensEffects += ', mild cabin low-light noise where illumination falls off';
    if (state.hasGlasses) derived.lensEffects += ', faint localized cabin-practical reflections on the eyeglass lenses';
  } else if (lightingProfile.kind === 'office-fluorescent') {
    derived.lensEffects += ', slight automatic white-balance drift typical of mixed fluorescent smartphone capture';
  }

  // Direct flash is a camera event layered on top of the selected ambient model.
  if (state.flashMode === 'direct-flash') {
    derived.flashEffects = 'Direct on-axis smartphone flash with sharp near-subject shadows, localized specular highlights, rapid inverse-square falloff, and limited highlight headroom. The flash supplements the selected ambient source rather than erasing it.';
    derived.shadowBehavior += ', plus a sharper flash-cast shadow close behind the subject wherever a nearby surface exists';
    derived.skinResponse += ', stronger physically localized flash specular highlights that reveal pores rather than smoothing them';
    derived.lensEffects += ', slight flash highlight clipping and a restrained organic flare only when reflective geometry supports it';
  }

  // --- 4. Sensor Limitations (Anti-AI Raw) ---"""
text, count = lighting_pattern.subn(lighting_replacement, text, count=1)
if count != 1:
    raise SystemExit(f'Could not replace layered lighting section: {count}')

# Prevent a phone-screen-only scene from reintroducing an active dashboard light in the environment description.
old_car_background = """  } else if (state.sceneFamily === 'car') {
    baseDetails = ['premium dark leather seat texture', 'seatbelt edge', 'subtle modern dashboard ambient lighting strip', 'sleek interior trim'];"""
new_car_background = """  } else if (state.sceneFamily === 'car') {
    const dashboardDetail = lightingProfile.soleAmbientSource
      ? 'dark inactive dashboard controls and trim with no emitted cabin fill light'
      : 'ordinary dashboard controls and sleek interior trim';
    baseDetails = ['premium dark leather seat texture', 'seatbelt edge', dashboardDetail, 'sleek interior trim'];"""
if old_car_background not in text:
    raise SystemExit('Car background marker missing')
text = text.replace(old_car_background, new_car_background, 1)

prompt_pattern = re.compile(
    r"const buildPromptText = \(semantic: SemanticScene, aiType: 'chatgpt' \| 'gemini'\): string => \{.*?\n\};\n\n// --- MAIN REACT APPLICATION ---",
    re.S,
)
prompt_replacement = """const buildPromptText = (semantic: SemanticScene, aiType: 'chatgpt' | 'gemini', state: SceneState): string => {
  const facts: PromptFacts = {
    hasGlasses: state.hasGlasses,
    backgroundDynamics: state.backgroundDynamics,
    captureType: state.captureType,
    useDigitalZoom: state.useDigitalZoom,
    lightingMode: state.lightingMode,
    timeOfDay: state.timeOfDay
  };

  const ir = buildPromptIR(semantic);
  const warnings = lintPromptIR(ir, facts);
  ir.warnings.push(...warnings);
  if (warnings.length) console.warn('[PhysFrame PromptLint]', warnings);
  return renderPromptIR(ir, aiType);
};

// --- MAIN REACT APPLICATION ---"""
text, count = prompt_pattern.subn(prompt_replacement, text, count=1)
if count != 1:
    raise SystemExit(f'Could not replace buildPromptText: {count}')

text = text.replace("chatGPTPrompt = buildPromptText(semantic, 'chatgpt');", "chatGPTPrompt = buildPromptText(semantic, 'chatgpt', state);")
text = text.replace("geminiPrompt = buildPromptText(semantic, 'gemini');", "geminiPrompt = buildPromptText(semantic, 'gemini', state);")

# Safety invariants for the codemod itself.
required = [
    "resolveLightingCompatibility({",
    "const lightingProfile = getLightingProfile(state.lightingMode);",
    "buildPromptIR(semantic)",
    "lintPromptIR(ir, facts)",
    "renderPromptIR(ir, aiType)",
    "chatGPTPrompt = buildPromptText(semantic, 'chatgpt', state);",
    "geminiPrompt = buildPromptText(semantic, 'gemini', state);"
]
missing = [needle for needle in required if needle not in text]
if missing:
    raise SystemExit(f'Missing Phase 1 invariants: {missing}')

for forbidden in [
    "const isExplicitDaylight = /نهاري|شمس الظهر|ساعة ذهبية|شروق|غروب/",
    "const isExplicitNightLight = /إنارة شارع|نيون|ليلية/",
    "Shot on a standard mobile device (approx 26mm-35mm equivalent focal length, f/1.8 aperture)"
]:
    if forbidden in text:
        raise SystemExit(f'Legacy conflict logic still present: {forbidden}')

path.write_text(text, encoding='utf-8')
print('PhysFrame Engine V2 Phase 1 refactor applied successfully.')
