import { describe, expect, it } from 'vitest';
import { resolveBackgroundDynamics } from './backgroundDynamics';
import type { SceneState } from '../types/scene';

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
  selfiePoseModifier: 'front-natural',
  freeHandPose: 'relaxed',
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

describe('resolveBackgroundDynamics', () => {
  it('keeps empty backgrounds free of crowd constraints', () => {
    const result = resolveBackgroundDynamics(makeState({ backgroundDynamics: 'empty' }));
    expect(result.description).toContain('no prominent background people');
    expect(result.constraints).toEqual([]);
  });

  it('keeps people outside the cabin for busy in-car scenes', () => {
    const result = resolveBackgroundDynamics(makeState({
      sceneFamily: 'car',
      subScene: 'car-interior',
      backgroundDynamics: 'busy'
    }));
    expect(result.description).toContain('outside the vehicle windows');
    expect(result.description).toContain('never appear inside the cabin');
    expect(result.constraints).toContain('NO background people staring at the camera');
  });

  it('keeps bedroom activity private and uncrowded', () => {
    const result = resolveBackgroundDynamics(makeState({
      sceneFamily: 'bedroom',
      backgroundDynamics: 'casual'
    }));
    expect(result.description).toContain('No crowd in the bedroom');
    expect(result.constraints).toContain('NO duplicated people or cloned faces');
  });

  it('distinguishes military parking from indoor workplace backgrounds', () => {
    const parking = resolveBackgroundDynamics(makeState({
      sceneFamily: 'military-base',
      subScene: 'sector-parking',
      backgroundDynamics: 'busy'
    }));
    const office = resolveBackgroundDynamics(makeState({
      sceneFamily: 'military-base',
      subScene: 'military-office',
      backgroundDynamics: 'busy'
    }));
    expect(parking.description).toContain('parking background');
    expect(office.description).toContain('corridor or office background');
  });
});
