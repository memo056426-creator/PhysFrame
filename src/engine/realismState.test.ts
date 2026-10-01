import { describe, expect, it } from 'vitest';
import { deriveRealismState } from './realismState';
import type { SceneState } from '../types/scene';

const makeState = (overrides: Partial<SceneState> = {}): SceneState => ({
  referenceImageId: null,
  hasGlasses: false,
  sceneFamily: 'bedroom',
  subScene: 'beside-bed',
  activity: 'واقف بشكل طبيعي',
  captureType: 'front-selfie',
  framing: 'chest-up',
  cameraAngle: 'eye-level',
  framingImperfection: 'perfect',
  useDigitalZoom: false,
  pose: 'واقف بثبات',
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

describe('deriveRealismState', () => {
  it('preserves front-selfie camera distance and lens behavior', () => {
    const result = deriveRealismState(makeState({ captureType: 'front-selfie', framing: 'chest-up' }));
    expect(result.cameraDistance).toBe('extended arm-reach (approx 65cm)');
    expect(result.lensEffects).toContain('smartphone front-camera aesthetic');
  });

  it('adds physically constrained mirror reflection rules', () => {
    const result = deriveRealismState(makeState({ captureType: 'mirror-selfie' }));
    expect(result.reflectionRules.join(' ')).toContain('geometrically accurate mirror reflection');
    expect(result.lensEffects).toContain('capturing a reflection');
  });

  it('layers direct flash onto ambient lighting instead of replacing it', () => {
    const result = deriveRealismState(makeState({ flashMode: 'direct-flash' }));
    expect(result.flashEffects).toContain('supplements the selected ambient source');
    expect(result.shadowBehavior).toContain('flash-cast shadow');
    expect(result.skinResponse).toContain('flash specular highlights');
  });

  it('preserves hand-prop and facial-hair prompt details', () => {
    const result = deriveRealismState(makeState({ handProp: 'car-keys', facialHairState: '3-day-stubble' }));
    expect(result.handPropDetails).toContain('car keys');
    expect(result.facialHairDetails).toContain('3-day stubble');
  });

  it('keeps digital zoom degradation limited to third-person captures', () => {
    const result = deriveRealismState(makeState({ captureType: 'third-person-candid', useDigitalZoom: true }));
    expect(result.lensEffects).toContain('digital zoom artifacts');
    expect(result.realismConstraints).toContain('digital zoom must reduce fine-detail fidelity rather than creating artificial optical bokeh');
  });
});
