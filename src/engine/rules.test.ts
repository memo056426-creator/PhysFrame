import { describe, expect, it } from 'vitest';
import { isConflictResolutionIdempotent, resolveSceneConflicts, type RuleSceneState, type SceneFamilyConfig } from './rules';

const family = (overrides: Partial<SceneFamilyConfig> = {}): SceneFamilyConfig => ({
  subScenes: ['داخل السيارة', 'بجانب السيارة متوقفة'],
  activities: ['خلف المقود والسيارة متوقفة'],
  poses: ['جالس باسترخاء في المقعد'],
  allowedLighting: ['ضوء نهاري طبيعي', 'إضاءة شاشة الهاتف فقط'],
  environmentRealism: ['طبيعية'],
  ...overrides
});

const baseState = (overrides: Partial<RuleSceneState> = {}): RuleSceneState & { environmentRealism: string } => ({
  sceneFamily: 'car',
  subScene: 'داخل السيارة',
  activity: 'خلف المقود والسيارة متوقفة',
  pose: 'جالس باسترخاء في المقعد',
  lightingMode: 'ضوء نهاري طبيعي',
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
      subScene: 'غير صالح',
      captureType: 'mirror-selfie',
      atmosphericCondition: 'breezy',
      outfitId: 'timeless15',
      hairStyle: 'h6'
    });
    const militaryFamily = family({
      subScenes: ['مكتب إداري عسكري', 'مواقف سيارات القطاع'],
      allowedLighting: ['إضاءة مكتب فلورسنت', 'شمس الظهر']
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
      subScenes: ['بجانب السرير', 'أمام الدولاب'],
      activities: ['جالس', 'واقف بشكل طبيعي'],
      poses: ['جالس على حافة السرير', 'واقف بثبات'],
      allowedLighting: ['ضوء نهاري طبيعي', 'إضاءة شاشة الهاتف فقط'],
      environmentRealism: ['طبيعية']
    });

    const unsupported = resolveSceneConflicts(
      baseState({
        sceneFamily: 'bedroom',
        subScene: 'بجانب السرير',
        activity: 'جالس',
        pose: 'جالس على حافة السرير',
        captureType: 'mirror-selfie'
      }),
      bedroomFamily
    );
    expect(unsupported.captureType).toBe('front-selfie');

    const supported = resolveSceneConflicts(
      baseState({
        sceneFamily: 'bedroom',
        subScene: 'أمام الدولاب',
        activity: 'واقف بشكل طبيعي',
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
      lightingMode: 'إضاءة شاشة الهاتف فقط',
      timeOfDay: 'midday',
      captureType: 'third-person-candid',
      foregroundObstruction: 'clean'
    });
    expect(isConflictResolutionIdempotent(initial, family())).toBe(true);
  });
});
