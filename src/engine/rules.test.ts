import { describe, expect, it } from 'vitest';
import { isConflictResolutionIdempotent, resolveSceneConflicts, type RuleSceneState, type SceneFamilyConfig } from './rules';

const family = (overrides: Partial<SceneFamilyConfig> = {}): SceneFamilyConfig => ({
  subScenes: ['car-interior', 'beside-parked-car'],
  activities: ['parked-behind-wheel'],
  poses: ['جالس باسترخاء في المقعد'],
  allowedLighting: ['natural-daylight', 'phone-screen'],
  environmentRealism: ['طبيعية'],
  ...overrides
});

const baseState = (overrides: Partial<RuleSceneState> = {}): RuleSceneState & { environmentRealism: string } => ({
  sceneFamily: 'car',
  subScene: 'car-interior',
  activity: 'parked-behind-wheel',
  pose: 'جالس باسترخاء في المقعد',
  lightingMode: 'natural-daylight',
  timeOfDay: 'midday',
  captureType: 'front-selfie',
  atmosphericCondition: 'neutral',
  foregroundObstruction: 'clean',
  hasGlasses: false,
  handProp: 'none',
  outfitId: 'timeless01',
  hairStyle: 'h4',
  environmentRealism: 'طبيعية',
  ...overrides
});

describe('resolveSceneConflicts', () => {
  it('never changes manual outfit or hairstyle selections', () => {
    const initial = baseState({
      sceneFamily: 'military-base',
      subScene: '',
      captureType: 'mirror-selfie',
      atmosphericCondition: 'breezy',
      outfitId: 'timeless15',
      hairStyle: 'h6'
    });
    const militaryFamily = family({
      subScenes: ['military-office', 'sector-parking'],
      allowedLighting: ['office-fluorescent', 'midday-sun']
    });

    const resolved = resolveSceneConflicts(initial, militaryFamily);
    expect(resolved.outfitId).toBe('timeless15');
    expect(resolved.hairStyle).toBe('h6');
  });

  it('normalizes unsupported mirror capture through scene capabilities', () => {
    const resolved = resolveSceneConflicts(
      baseState({ sceneFamily: 'car', captureType: 'mirror-selfie' }),
      family()
    );
    expect(resolved.captureType).toBe('front-selfie');
  });

  it('allows mirror capture only in a sub-scene that explicitly supports it', () => {
    const bedroomFamily = family({
      subScenes: ['beside-bed', 'wardrobe-front'],
      activities: ['seated', 'standing-natural'],
      poses: ['جالس على حافة السرير', 'واقف بثبات'],
      allowedLighting: ['natural-daylight', 'phone-screen'],
      environmentRealism: ['طبيعية']
    });

    const unsupported = resolveSceneConflicts(
      baseState({
        sceneFamily: 'bedroom',
        subScene: 'beside-bed',
        activity: 'seated',
        pose: 'جالس على حافة السرير',
        captureType: 'mirror-selfie'
      }),
      bedroomFamily
    );
    expect(unsupported.captureType).toBe('front-selfie');

    const supported = resolveSceneConflicts(
      baseState({
        sceneFamily: 'bedroom',
        subScene: 'wardrobe-front',
        activity: 'standing-natural',
        pose: 'واقف بثبات',
        captureType: 'mirror-selfie'
      }),
      bedroomFamily
    );
    expect(supported.captureType).toBe('mirror-selfie');
  });

  it('forces through-glass physics only for a candid shot into the car cabin', () => {
    const candid = resolveSceneConflicts(
      baseState({ captureType: 'third-person-candid', foregroundObstruction: 'clean' }),
      family()
    );
    expect(candid.foregroundObstruction).toBe('through-glass');

    const selfie = resolveSceneConflicts(
      baseState({ captureType: 'front-selfie', foregroundObstruction: 'clean' }),
      family()
    );
    expect(selfie.foregroundObstruction).toBe('clean');
  });

  it('removes an eyewear-only hand action when glasses are disabled', () => {
    const resolved = resolveSceneConflicts(
      baseState({ hasGlasses: false, handProp: 'adjusting-glasses' }),
      family()
    );
    expect(resolved.handProp).toBe('none');
  });

  it('is idempotent after one resolution pass', () => {
    const initial = baseState({
      lightingMode: 'phone-screen',
      timeOfDay: 'midday',
      captureType: 'third-person-candid',
      foregroundObstruction: 'clean'
    });
    expect(isConflictResolutionIdempotent(initial, family())).toBe(true);
  });
});
