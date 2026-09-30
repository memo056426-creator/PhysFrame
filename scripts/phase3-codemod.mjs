import fs from 'node:fs';

const path = 'src/App.tsx';
let source = fs.readFileSync(path, 'utf8');

const replaceOnce = (from, to, label) => {
  if (!source.includes(from)) throw new Error(`Phase 3 codemod could not find: ${label}`);
  source = source.replace(from, to);
};

replaceOnce(
  "import { buildSmartComposition } from './engine/smartComposition';",
  "import { buildSmartComposition } from './engine/smartComposition';\nimport { buildPhysicalProfile, lintPhysicalText, mergeFabricPhysics } from './engine/physics';\nimport { buildNegativeConstraints } from './engine/constraints';",
  'engine imports'
);

replaceOnce(
  `const deriveRealismState = (state: SceneState): DerivedSceneState => {\n  const lightingProfile = getLightingProfile(state.lightingMode);\n  const derived: DerivedSceneState = {\n    skinResponse: 'untouched real human skin chemistry, microscopically visible vellus hair (peach fuzz), uneven natural melanin distribution',\n    hairCondition: 'maintains natural original density, individual stray hairs visible, no helmet-like perfect styling',\n    fabricBehavior: [],\n    shadowBehavior: 'physically plausible contact shadows',\n    environmentalLightBehavior: 'natural indirect bounce light',\n    cameraDistance: 'arm-length distance (approx 40-60cm)',\n    visibleBackgroundElements: [],\n    contactPhysics: [],\n    reflectionRules: [],\n    realismConstraints: ['MUST LOOK LIKE AN UNEDITED SMARTPHONE SNAPSHOT', 'NO PROFESSIONAL STUDIO LIGHTING', 'NO CGI OR 3D RENDER AESTHETICS'],\n    lensEffects: 'standard smartphone computational photography',\n    handPropDetails: '',\n    facialHairDetails: '',\n    flashEffects: '',\n    framingImperfectionDetails: 'balanced intentional framing with natural smartphone headroom'\n  };`,
  `const deriveRealismState = (state: SceneState): DerivedSceneState => {\n  const lightingProfile = getLightingProfile(state.lightingMode);\n  const physicalProfile = buildPhysicalProfile({\n    hasGlasses: state.hasGlasses,\n    clothingCondition: state.clothingCondition,\n    captureType: state.captureType,\n    pose: state.pose,\n    handProp: state.handProp,\n    facialHairState: state.facialHairState\n  });\n  const derived: DerivedSceneState = {\n    skinResponse: physicalProfile.skinResponse,\n    hairCondition: physicalProfile.hairCondition,\n    fabricBehavior: [...physicalProfile.fabricBehavior],\n    shadowBehavior: 'physically plausible contact shadows',\n    environmentalLightBehavior: 'natural indirect bounce light',\n    cameraDistance: 'arm-length distance (approx 40-60cm)',\n    visibleBackgroundElements: [],\n    contactPhysics: [...physicalProfile.contactPhysics],\n    reflectionRules: [],\n    realismConstraints: ['MUST LOOK LIKE AN UNEDITED SMARTPHONE SNAPSHOT', 'NO PROFESSIONAL STUDIO LIGHTING', 'NO CGI OR 3D RENDER AESTHETICS', ...physicalProfile.realismConstraints],\n    lensEffects: ['standard smartphone computational photography', ...physicalProfile.eyewearLensEffects].join(', '),\n    handPropDetails: '',\n    facialHairDetails: '',\n    flashEffects: '',\n    framingImperfectionDetails: 'balanced intentional framing with natural smartphone headroom'\n  };`,
  'deriveRealismState initialization'
);

replaceOnce(
  `\n  // --- 1. Base Realism Injections (Skin & Shadows Physics) ---\n  derived.skinResponse += ', subtle subsurface scattering visible on ears and nose tip, micro-specular highlights on forehead and nose bridge from natural skin oils';\n  derived.skinResponse += ', ZERO digital skin smoothing, zero airbrushing, unpolished raw human skin, clearly visible enlarged micro-pores, subtle microscopic skin texture irregularities, fine expression lines around eyes and mouth, completely unpowdered skin with natural uncorrected texture';\n  derived.skinResponse += ', slightly realistic tired eyes, natural imperfect eyelashes that clump together randomly, subtle natural dark circles under eyes, unglamorous real-world facial expression';\n  derived.shadowBehavior += ', deep ambient occlusion in clothing folds and under jawline, hard physically accurate contact shadow grounding the subject';\n  derived.skinResponse += ', natural uneven T-zone oiliness with slightly stronger unpowdered sheen on the forehead and nose than on the cheeks';\n  derived.fabricBehavior.push(\n    'microscopic lint fibers visible only where light catches the fabric',\n    'a few sparse natural dust specks rather than a digitally spotless surface',\n    'non-uniform physically plausible micro-wrinkles and pressure creases instead of perfectly smoothed cloth'\n  );\n\n\n  if (state.hasGlasses) {\n    derived.lensEffects += ', subtle optical refraction through the thicker edge of the glasses lens causing a minute natural cheekbone displacement, microscopic smartphone-screen reflection visible in one lens when angle and lighting permit';\n    derived.realismConstraints.push('PRESERVE the exact eyeglass frame shape, size, color, fit, lens geometry, and temple position from the reference image', 'eyeglasses must show realistic bridge contact and temple pressure with no warped or floating frames');\n  }\n`,
  `\n  // --- 1. Typed Human & Material Physics ---\n  // Skin, hair, fabric, contact, and baseline eyewear physics are compiled in engine/physics.ts.\n`,
  'legacy base physics block'
);

replaceOnce(
  "    derived.contactPhysics.push('one arm clearly extended holding the camera with asymmetrical shoulder elevation, visible clavicle tension on the camera-holding side, subtle torso compensation, and the clothing collar shifted slightly by the raised arm');\n",
  '',
  'legacy selfie contact physics'
);

replaceOnce(
  `\n  // --- 6. Physics & Contact Logic ---\n  if (state.pose.includes('جالس')) {\n    derived.contactPhysics.push('natural weight distribution, clothing compressing realistically against the sitting surface, localized fabric bunching at hips and knees');\n  } else if (state.pose.includes('مستند')) {\n    derived.contactPhysics.push('clear physical contact point holding partial body weight, natural fabric tension and stretching at the contact area');\n  }\n`,
  '',
  'legacy pose contact physics'
);

replaceOnce(
  `\n  if (state.clothingCondition === 'worn-all-day') {\n    derived.fabricBehavior.push('irregular deep horizontal creases at joints (elbows, waist)', 'random unsymmetrical bunching', 'loss of crisp ironing, localized realistic wrinkles');\n  } else if (state.clothingCondition === 'vintage-washed') {\n    derived.fabricBehavior.push('faded fabric dye', 'slight wear and micro-fraying at collar and sleeve edges', 'soft worn-in matte texture');\n  }\n`,
  '',
  'legacy clothing condition physics'
);

replaceOnce(
  `      if (state.handProp === 'phone') derived.contactPhysics.push('hand gripping phone naturally, thumb visible on screen edge');\n      else if (state.handProp === 'car-keys') derived.contactPhysics.push('fingers wrapped around key fob, natural grip tension');\n      else if (state.handProp === 'coffee-cup') derived.contactPhysics.push('hand wrapped around warm cup, fingers positioned naturally');\n`,
  '',
  'legacy prop contact physics'
);

replaceOnce(
  `  if (facialHair) {\n    derived.facialHairDetails = facialHair.prompt;\n    if (state.facialHairState === '3-day-stubble') derived.skinResponse += ', visible coarse stubble texture on jawline and cheeks, individual hair follicles catching light';\n    else if (state.facialHairState === 'full-beard-unkempt') derived.skinResponse += ', natural beard growth with slight unevenness, stray hairs visible';\n  }`,
  `  if (facialHair) {\n    derived.facialHairDetails = facialHair.prompt;\n  }`,
  'legacy facial-hair skin physics'
);

const negativeStart = source.indexOf('const buildNegativeConstraints = (state: SceneState): string[] => {');
const semanticStart = source.indexOf('const buildSemanticScene = (state: SceneState, derived: DerivedSceneState): SemanticScene => {');
if (negativeStart < 0 || semanticStart < 0 || semanticStart <= negativeStart) {
  throw new Error('Phase 3 codemod could not isolate legacy negative constraints');
}
source = source.slice(0, negativeStart) + source.slice(semanticStart);

replaceOnce(
  `  const backgroundDynamics = resolveBackgroundDynamics(state);\n\n  let captureMechanics = '';`,
  `  const backgroundDynamics = resolveBackgroundDynamics(state);\n  const fabricPhysics = mergeFabricPhysics(outfit?.physics || [], derived.fabricBehavior);\n\n  let captureMechanics = '';`,
  'fabric merge setup'
);

replaceOnce(
  "    hair: `${hair?.prompt}. Physics: ${hair?.physics}. ${derived.hairCondition}. CRITICAL: Apply the selected hairstyle, but maintain the EXACT biological hair density, volume, hairline, and scalp visibility seen in the reference image. DO NOT artificially thicken hair or fill in sparse areas.`,",
  "    hair: `${hair?.prompt}. Physics: ${hair?.physics}. ${derived.hairCondition}.`,",
  'hair output'
);

replaceOnce(
  "    outfitPhysics: (outfit?.physics || []).join(', ') + '. ' + derived.fabricBehavior.join(', '),",
  "    outfitPhysics: fabricPhysics.text,",
  'outfit physics merge'
);

replaceOnce(
  `  const warnings = lintPromptIR(ir, facts);\n  ir.warnings.push(...warnings);\n  if (warnings.length) console.warn('[PhysFrame PromptLint]', warnings);`,
  `  const warnings = lintPromptIR(ir, facts);\n  const physicsWarnings = lintPhysicalText(\n    [semantic.hair, semantic.outfitPhysics, semantic.poseAndContact, semantic.skinResponse, semantic.cameraRealism, semantic.styleConstraints].join('\\n'),\n    { hasGlasses: state.hasGlasses, captureType: state.captureType }\n  );\n  ir.warnings.push(...warnings, ...physicsWarnings);\n  if (warnings.length || physicsWarnings.length) console.warn('[PhysFrame PromptLint]', [...warnings, ...physicsWarnings]);`,
  'physics prompt lint integration'
);

fs.writeFileSync(path, source);
console.log('Phase 3 typed physics integration materialized successfully.');
