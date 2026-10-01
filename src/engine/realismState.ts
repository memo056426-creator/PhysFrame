import { FACIAL_HAIR_STATES, HAND_PROPS } from '../data/sceneOptions';
import type { DerivedSceneState, SceneState } from '../types/scene';
import { buildGroupSelfieProfile } from './groupSelfie';
import { getLightingProfile } from './lighting';
import { buildPhysicalProfile } from './physics';

// --- REALISM DERIVATION ---
export const deriveRealismState = (state: SceneState): DerivedSceneState => {
  const lightingProfile = getLightingProfile(state.lightingMode);
  const physicalProfile = buildPhysicalProfile({
    hasGlasses: state.hasGlasses,
    clothingCondition: state.clothingCondition,
    captureType: state.captureType,
    pose: state.pose,
    handProp: state.handProp,
    facialHairState: state.facialHairState
  });
  const groupSelfieProfile = buildGroupSelfieProfile({
    enabled: state.groupSelfieEnabled,
    companionCount: state.groupSelfieCompanionCount,
    captureType: state.captureType
  });
  const derived: DerivedSceneState = {
    skinResponse: physicalProfile.skinResponse,
    hairCondition: physicalProfile.hairCondition,
    fabricBehavior: [...physicalProfile.fabricBehavior],
    shadowBehavior: 'physically plausible contact shadows',
    environmentalLightBehavior: 'natural indirect bounce light',
    cameraDistance: 'arm-length distance (approx 40-60cm)',
    visibleBackgroundElements: [],
    contactPhysics: [...physicalProfile.contactPhysics],
    reflectionRules: [],
    realismConstraints: ['MUST LOOK LIKE AN UNEDITED SMARTPHONE SNAPSHOT', 'NO PROFESSIONAL STUDIO LIGHTING', 'NO CGI OR 3D RENDER AESTHETICS', ...physicalProfile.realismConstraints],
    lensEffects: ['standard smartphone computational photography', ...physicalProfile.eyewearLensEffects].join(', '),
    handPropDetails: '',
    facialHairDetails: '',
    flashEffects: '',
    framingImperfectionDetails: 'balanced intentional framing with natural smartphone headroom'
  };

  // --- 1. Typed Human & Material Physics ---
  // Skin, hair, fabric, contact, and baseline eyewear physics are compiled in engine/physics.ts.

  // --- 2. Layered Lighting Engine ---
  // Ambient/practical illumination and capture flash are separate physical layers.
  derived.environmentalLightBehavior = lightingProfile.ambientDescription;
  derived.shadowBehavior = `${lightingProfile.shadowDescription}, deep physically plausible contact occlusion where surfaces meet`;

  // Profile-driven light/sensor/subject response keeps every new lighting mode physically synchronized.
  if (lightingProfile.sensorDescription) {
    derived.lensEffects += `, ${lightingProfile.sensorDescription}`;
  }
  if (lightingProfile.subjectResponseDescription) {
    derived.skinResponse += `, ${lightingProfile.subjectResponseDescription}`;
  }
  if (state.hasGlasses && lightingProfile.eyewearEffectDescription) {
    derived.lensEffects += `, ${lightingProfile.eyewearEffectDescription}`;
  }
  if (state.hasGlasses && lightingProfile.eyewearShadowDescription) {
    derived.shadowBehavior += `, ${lightingProfile.eyewearShadowDescription}`;
  }

  // Direct flash is a camera event layered on top of the selected ambient model.
  if (state.flashMode === 'direct-flash') {
    derived.flashEffects = 'Direct on-axis smartphone flash with sharp near-subject shadows, localized specular highlights, rapid inverse-square falloff, and limited highlight headroom. The flash supplements the selected ambient source rather than erasing it.';
    derived.shadowBehavior += ', plus a sharper flash-cast shadow close behind the subject wherever a nearby surface exists';
    derived.skinResponse += ', stronger physically localized flash specular highlights that reveal pores rather than smoothing them';
    derived.lensEffects += ', slight flash highlight clipping and a restrained organic flare only when reflective geometry supports it';
  }

  // --- 4. Sensor Limitations (Anti-AI Raw) ---
  if (state.realismStyle === 'anti-ai-raw') {
    derived.lensEffects += ', slight chromatic aberration (purple/green fringing) on high-contrast edges, microscopic sensor grain';
    derived.realismConstraints.push('NO impossible room-wide ambient fill light', 'NO perfectly white-balanced lighting, allow natural color casts', 'NO artificial denoising', 'ZERO digital skin smoothing or airbrushing', 'preserve visible pores, fine lines, dark circles, eyelash irregularity, and uncorrected skin texture', 'NO beauty-filter eye enlargement, glowing eyes, or doll-like facial cleanup');
  }

  // --- 5. Camera & Lens Logic ---
  if (state.captureType === 'front-selfie') {
    if (groupSelfieProfile.active) {
      derived.lensEffects = `${groupSelfieProfile.lensDescriptor}. ${derived.lensEffects}`;
      derived.cameraDistance = groupSelfieProfile.cameraDistance;
    } else {
      derived.lensEffects = 'smartphone front-camera aesthetic, 24mm equivalent focal length, slight natural barrel distortion at frame edges, handheld micro-shake. ' + derived.lensEffects;
      derived.cameraDistance = state.framing === 'head-shoulders' ? 'close arm-reach (approx 40cm)' : 'extended arm-reach (approx 65cm)';
    }
  } else if (state.captureType === 'mirror-selfie') {
    derived.reflectionRules.push('geometrically accurate mirror reflection, smartphone clearly visible in hand, slight mirror glass imperfection or dust motes on surface');
    derived.lensEffects = 'smartphone main camera capturing a reflection, 26mm equivalent, natural focus on the mirror surface, slight depth falloff. ' + derived.lensEffects;
  } else {
    derived.cameraDistance = 'third-person candid distance (approx 1.5 - 3 meters)';
    derived.realismConstraints.push('candid framing without selfie-arm mechanics, natural depth of field');
    derived.lensEffects = 'smartphone main camera aesthetic, 35mm equivalent focal length, natural f/1.8 depth of field with gradual, non-artificial background blur. ' + derived.lensEffects;
    if (state.useDigitalZoom) {
      derived.lensEffects = 'smartphone digital zoom artifacts from an in-sensor crop, slight watercolor-like upscaling on fine textures such as hair and fabric fibers, loss of micro-contrast, mild edge sharpening halos. ' + derived.lensEffects;
      derived.realismConstraints.push('digital zoom must reduce fine-detail fidelity rather than creating artificial optical bokeh');
    }
  }

  if (state.framingImperfection === 'dutch-angle') {
    derived.framingImperfectionDetails = 'unintentional slight Dutch angle of roughly 2-5 degrees, imperfect horizon, casual amateur phone handling';
  } else if (state.framingImperfection === 'awkward-crop') {
    derived.framingImperfectionDetails = 'awkward amateur crop with slightly tight or uneven headroom and imperfect centering, while keeping the eyes, chin, and essential facial identity readable';
  } else {
    derived.framingImperfectionDetails = 'balanced intentional framing with natural smartphone headroom and no artificial studio-perfect symmetry';
  }

  // --- 7. Background Details ---
  let baseDetails: string[] = [];
  if (state.sceneFamily === 'military-base') {
    baseDetails = ['official institutional document folders', 'neutral formal walls', 'subtle framed national emblem'];
    if (state.subScene.includes('مواقف')) baseDetails = ['realistic asphalt parking lot', 'parked official white SUVs', 'harsh daylight reflections'];
  } else if (state.sceneFamily === 'car') {
    const dashboardDetail = lightingProfile.soleAmbientSource
      ? 'dark inactive dashboard controls and trim with no emitted cabin fill light'
      : 'ordinary dashboard controls and sleek interior trim';
    baseDetails = ['premium dark leather seat texture', 'seatbelt edge', dashboardDetail, 'sleek interior trim'];
  } else if (state.sceneFamily === 'saudi-outdoor') {
    baseDetails = ['realistic pavement', 'neutral walls', 'parked vehicles', 'subtle heat haze'];
  } else if (state.sceneFamily === 'living-room' || state.sceneFamily === 'bedroom') {
    baseDetails = ['everyday household items slightly out of focus', 'natural lived-in environment details'];
  }

  if (state.framing === 'head-shoulders') derived.visibleBackgroundElements = baseDetails.slice(0, 2).map(d => `near-field: ${d}`);
  else derived.visibleBackgroundElements = baseDetails;

  // --- 8. Imperfections Injection ---
  if (state.lensCondition === 'budget-android') {
    derived.lensEffects = 'low-end smartphone processing, slight overall optical softness, blown-out highlights in bright areas, crushed blacks, inferior HDR recovery artifacts. ' + derived.lensEffects;
  } else if (state.lensCondition === 'smudged-lens') {
    derived.lensEffects = 'photographed through a slightly smudged lens, oily finger smudge causing organic light bloom and streaks, localized loss of micro-contrast around light sources. ' + derived.lensEffects;
  }

  // --- 9. Hand Prop Details ---
  if (state.handProp !== 'none' && (state.handProp !== 'adjusting-glasses' || state.hasGlasses)) {
    const prop = HAND_PROPS.find(p => p.id === state.handProp);
    if (prop) {
      derived.handPropDetails = prop.prompt;
    }
  }

  // --- 10. Facial Hair Details ---
  const facialHair = FACIAL_HAIR_STATES.find(f => f.id === state.facialHairState);
  if (facialHair) {
    derived.facialHairDetails = facialHair.prompt;
  }

  return derived;
};

