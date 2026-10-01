import { describe, expect, it } from 'vitest';
import { buildSemanticScene } from './semanticScene';
import type { DerivedSceneState, SceneState } from '../types/scene';

const makeState = (overrides: Partial<SceneState> = {}): SceneState => ({
  referenceImageId: null,
  hasGlasses: false,
  sceneFamily: 'bedroom',
  subScene: 'beside-bed',
  activity: 'standing-natural',
  captureType: 'front-selfie',
  framing: 'chest-up',
  cameraAngle: 'eye-level',
  framingImperfection: 'perfect',
  useDigitalZoom: false,
  pose: 'standing-steady',
  outfitId: 'cas1',
  hairStyle: 'h1',
  expression: 'e1',
  timeOfDay: 'midday',
  lightingMode: 'natural-daylight',
  environmentRealism: 'طبيعية',
  realismStyle: 'raw-candid',
  lensCondition: 'modern-iphone',
  clothingCondition: 'crisp',
  atmosphericCondition: 'neutral',
  foregroundObstruction: 'clean',
  gazeDirection: 'at-camera',
  handProp: 'none',
  facialHairState: '3-day-stubble',
  flashMode: 'no-flash',
  backgroundDynamics: 'empty',
  groupSelfieEnabled: false,
  groupSelfieCompanionCount: 1,
  ...overrides
});

const makeDerived = (overrides: Partial<DerivedSceneState> = {}): DerivedSceneState => ({
  skinResponse: 'natural skin texture',
  hairCondition: 'natural hair condition',
  fabricBehavior: ['natural fabric folds'],
  shadowBehavior: 'physically plausible contact shadows',
  environmentalLightBehavior: 'natural indirect bounce light',
  cameraDistance: 'extended arm-reach (approx 65cm)',
  visibleBackgroundElements: ['everyday household items slightly out of focus'],
  contactPhysics: ['selfie arm anatomically connected to shoulder', 'feet grounded naturally'],
  reflectionRules: [],
  realismConstraints: ['MUST LOOK LIKE AN UNEDITED SMARTPHONE SNAPSHOT'],
  lensEffects: 'smartphone front-camera aesthetic',
  handPropDetails: '',
  facialHairDetails: '3-day stubble',
  flashEffects: '',
  framingImperfectionDetails: 'balanced intentional framing with natural smartphone headroom',
  ...overrides
});

describe('buildSemanticScene', () => {
  it('builds front-selfie capture semantics from derived camera geometry', () => {
    const semantic = buildSemanticScene(makeState(), makeDerived());
    expect(semantic.captureMechanics).toContain('Smartphone front-camera selfie');
    expect(semantic.captureMechanics).toContain('extended arm-reach (approx 65cm)');
    expect(semantic.outfit).toContain('beige linen shirt');
    expect(semantic.visibleEnvironment).toContain('Visible elements: everyday household items slightly out of focus');
    expect(semantic.poseAndContact).toContain('Pose: واقف بثبات');
    expect(semantic.poseAndContact).not.toContain('standing-steady');
    expect(semantic.poseAndContact).toContain('Activity: واقف بشكل طبيعي');
    expect(semantic.poseAndContact).not.toContain('standing-natural');
  });

  it('adds strict eyeglass identity preservation only when glasses are enabled', () => {
    const withGlasses = buildSemanticScene(makeState({ hasGlasses: true }), makeDerived());
    const withoutGlasses = buildSemanticScene(makeState({ hasGlasses: false }), makeDerived());
    expect(withGlasses.identity).toContain('STRICTLY preserve the exact same frame shape');
    expect(withoutGlasses.identity).not.toContain('STRICTLY preserve the exact same frame shape');
  });

  it('preserves mirror reflection rules in mirror-selfie capture mechanics', () => {
    const semantic = buildSemanticScene(
      makeState({ captureType: 'mirror-selfie' }),
      makeDerived({ reflectionRules: ['geometrically accurate mirror reflection'] })
    );
    expect(semantic.captureMechanics).toContain('Smartphone mirror selfie');
    expect(semantic.captureMechanics).toContain('geometrically accurate mirror reflection');
  });

  it('injects group-selfie identity, anatomy, style, and negative constraints', () => {
    const semantic = buildSemanticScene(
      makeState({ groupSelfieEnabled: true, groupSelfieCompanionCount: 2 }),
      makeDerived()
    );
    expect(semantic.identity).toContain('STRICT ZERO CLONED FACES');
    expect(semantic.poseAndContact).toContain('Group anatomical integrity');
    expect(semantic.styleConstraints).toContain('ONLY biometric reference identity');
    expect(semantic.negativePrompt).toContain('cloned faces');
  });

  it('preserves scene-specific background dynamics in semantic output', () => {
    const semantic = buildSemanticScene(
      makeState({ backgroundDynamics: 'casual', sceneFamily: 'bedroom' }),
      makeDerived()
    );
    expect(semantic.backgroundDynamics).toContain('No crowd in the bedroom');
    expect(semantic.styleConstraints).toContain('NO background people staring at the camera');
  });
});
