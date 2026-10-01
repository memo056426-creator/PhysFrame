import { EXPRESSIONS, GAZE_DIRECTIONS, HAIRSTYLES, SCENE_FAMILIES } from '../data/sceneOptions';
import { OUTFITS } from '../data/outfits';
import type { DerivedSceneState, SceneState, SemanticScene } from '../types/scene';
import { resolveBackgroundDynamics } from './backgroundDynamics';
import { buildNegativeConstraints } from './constraints';
import { buildGroupSelfieProfile } from './groupSelfie';
import { mergeFabricPhysics } from './physics';

const IDENTITY_LOCK = `Preserve exact facial identity from the reference image. 193cm height, 83kg weight, tall lean-athletic male build. DO NOT alter facial proportions, head geometry, hairline, or natural hair density. DO NOT artificially beautify, de-age, or smooth skin. Preserve natural facial asymmetry and existing beard/moustache growth pattern.`;

export const buildSemanticScene = (state: SceneState, derived: DerivedSceneState): SemanticScene => {
  const outfit = OUTFITS.find(o => o.id === state.outfitId);
  const hair = HAIRSTYLES.find(h => h.id === state.hairStyle);
  const expression = EXPRESSIONS.find(e => e.id === state.expression);
  const gaze = GAZE_DIRECTIONS.find(g => g.id === state.gazeDirection);
  const backgroundDynamics = resolveBackgroundDynamics(state);
  const fabricPhysics = mergeFabricPhysics(outfit?.physics || [], derived.fabricBehavior);
  const groupSelfieProfile = buildGroupSelfieProfile({ enabled: state.groupSelfieEnabled, companionCount: state.groupSelfieCompanionCount, captureType: state.captureType });

  let captureMechanics = '';
  if (state.captureType === 'front-selfie') {
    captureMechanics = groupSelfieProfile.active
      ? `${groupSelfieProfile.captureMechanics} Framing: ${state.framing}. Camera angle: ${state.cameraAngle}. Distance: ${derived.cameraDistance}. Amateur framing behavior: ${derived.framingImperfectionDetails}. Main-subject gaze: ${gaze?.prompt}. Shooter anatomy: ${derived.contactPhysics.find(p => p.includes('arm')) || ''}`
      : `Smartphone front-camera selfie. Framing: ${state.framing}. Camera angle: ${state.cameraAngle}. Distance: ${derived.cameraDistance}. Amateur framing behavior: ${derived.framingImperfectionDetails}. Gaze: ${gaze?.prompt}. ${derived.contactPhysics.find(p => p.includes('arm')) || ''}`;
  } else if (state.captureType === 'mirror-selfie') {
    captureMechanics = `Smartphone mirror selfie. Framing: ${state.framing}. Distance: ${derived.cameraDistance}. Framing behavior: ${derived.framingImperfectionDetails}. Gaze: ${gaze?.prompt}. ${derived.reflectionRules.join('. ')}`;
  } else {
    captureMechanics = `Third-person candid photograph. Framing: ${state.framing}. Camera angle: ${state.cameraAngle}. Distance: ${derived.cameraDistance}. Framing behavior: ${derived.framingImperfectionDetails}. Gaze: ${gaze?.prompt}.`;
  }

  let cameraRealism = `Style: ${state.realismStyle.replace('-', ' ')}. ${derived.lensEffects}. Avoid CGI glossy look.`;
  if (state.realismStyle === 'anti-ai-raw') {
    cameraRealism = `Style: Absolute raw hyper-realism. Unedited, unfiltered mobile capture. ${derived.lensEffects}. Preserve believable sensor limitations and ordinary handheld imperfections.`;
  }

  const identityBase = state.hasGlasses
    ? `${IDENTITY_LOCK} The subject wears eyeglasses in the reference image: STRICTLY preserve the exact same frame shape, color, proportions, lens geometry, bridge fit, and temple position.`
    : IDENTITY_LOCK;

  return {
    identity: groupSelfieProfile.active ? `${identityBase} ${groupSelfieProfile.identityRules}` : identityBase,
    body: '193cm, 83kg, tall lean-athletic male build.',
    captureMechanics,
    hair: `${hair?.prompt}. Physics: ${hair?.physics}. ${derived.hairCondition}.`,
    expression: `${expression?.prompt || 'neutral'}, slightly realistic tired eyes, natural imperfect eyelashes that clump together randomly, subtle natural dark circles under eyes, unglamorous real-world facial expression`,
    outfit: outfit?.prompt || '',
    outfitPhysics: fabricPhysics.text,
    poseAndContact: `Pose: ${state.pose}. Activity: ${state.activity}. Contact rules: ${derived.contactPhysics.filter(p => !p.includes('arm')).join('. ')}${groupSelfieProfile.active ? `. Group anatomical integrity: ${groupSelfieProfile.anatomyRules} Group candid dynamics: ${groupSelfieProfile.dynamicsRules}` : ''}`,
    visibleEnvironment: `Location: ordinary realistic ${SCENE_FAMILIES[state.sceneFamily!].labelAR} setting. Visible elements: ${derived.visibleBackgroundElements.join(', ')}. No iconic landmarks. Environment state: ${state.environmentRealism}.`,
    lighting: `Time: ${state.timeOfDay}. Lighting source: ${state.lightingMode}. Behavior: ${derived.environmentalLightBehavior}. Shadows: ${derived.shadowBehavior}.`,
    skinResponse: derived.skinResponse,
    cameraRealism,
    styleConstraints: Array.from(new Set([...derived.realismConstraints, ...backgroundDynamics.constraints, ...groupSelfieProfile.styleConstraints])).join('. '),
    handProp: derived.handPropDetails,
    facialHair: derived.facialHairDetails,
    flashDetails: derived.flashEffects,
    shadowBehavior: derived.shadowBehavior,
    backgroundDynamics: backgroundDynamics.description,
    negativePrompt: buildNegativeConstraints({ backgroundDynamics: state.backgroundDynamics, groupSelfieEnabled: groupSelfieProfile.active }).join(', ')
  };
};
