import { describe, expect, it } from 'vitest';
import { getAllowedCaptureTypes } from './capabilities';
import { buildSmartComposition, type SceneFamilyMap, type SmartCompositionState } from './smartComposition';
import { resolveSceneConflicts } from './rules';

const families: SceneFamilyMap = {
  'military-base': {
    subScenes: ['military-office', 'building-corridor', 'sector-emblem-wall', 'sector-parking'],
    activities: ['military-office-work', 'short-break', 'on-duty', 'standing-proud'],
    poses: ['standing-upright', 'seated-behind-desk', 'leaning-back-on-desk', 'standing-steady'],
    allowedLighting: ['office-fluorescent', 'window-daylight', 'corridor-practical', 'midday-sun'],
    environmentRealism: ['رسمية ومنظمة', 'نشطة (عمل يومي)']
  },
  'saudi-outdoor': {
    subScenes: ['residential-villa-street', 'modern-residential-neighborhood', 'local-commercial-street', 'cafe-front', 'parking-lot', 'neighborhood-park', 'fitness-walkway'],
    activities: ['walking-calmly', 'standing-natural', 'waiting', 'seated-at-cafe'],
    poses: ['standing-steady', 'walking-natural', 'leaning-on-wall', 'leaning-back-on-wall', 'seated-on-chair'],
    allowedLighting: ['natural-daylight', 'midday-sun', 'golden-hour', 'warm-street', 'commercial-neon'],
    environmentRealism: ['هادئ', 'طبيعي', 'نشط']
  },
  car: {
    subScenes: ['car-interior', 'beside-parked-car'],
    activities: ['parked-behind-wheel', 'passenger-seat', 'seated-calm-in-car'],
    poses: ['relaxed-in-seat', 'leaning-on-steering-wheel'],
    allowedLighting: ['natural-daylight', 'midday-sun', 'vehicle-interior', 'street-through-glass', 'phone-screen'],
    environmentRealism: ['مرتبة', 'طبيعية', 'مستخدمة يوميًا']
  },
  'living-room': {
    subScenes: ['living-room-center', 'by-window', 'in-front-of-tv'],
    activities: ['seated-on-sofa', 'standing-natural', 'drinking-coffee', 'using-phone'],
    poses: ['relaxed-on-sofa', 'standing-steady', 'leaning-on-table'],
    allowedLighting: ['natural-daylight', 'ceiling-practical', 'mixed-night', 'phone-screen'],
    environmentRealism: ['مرتبة', 'طبيعية', 'مستخدمة يوميًا']
  },
  bedroom: {
    subScenes: ['beside-bed', 'bed-edge', 'wardrobe-front', 'with-laptop'],
    activities: ['seated', 'standing-natural', 'relaxing', 'using-phone'],
    poses: ['seated-on-bed-edge', 'semi-reclined', 'leaning-on-the-wall', 'standing-steady'],
    allowedLighting: ['natural-daylight', 'ceiling-practical', 'warm-lamp', 'phone-screen'],
    environmentRealism: ['مرتبة', 'طبيعية', 'مستخدمة يوميًا']
  },
  gym: {
    subScenes: ['beside-weights', 'mirror-area', 'equipment-area'],
    activities: ['pre-workout', 'rest-between-sets', 'post-workout'],
    poses: ['standing-by-equipment', 'seated-on-gym-bench', 'holding-water-bottle'],
    allowedLighting: ['gym-practical', 'natural-daylight'],
    environmentRealism: ['هادئ', 'طبيعي', 'نشط']
  }
};

const initial: SmartCompositionState = {
  sceneFamily: 'bedroom',
  subScene: 'beside-bed',
  activity: 'seated',
  pose: 'seated-on-bed-edge',
  lightingMode: 'natural-daylight',
  timeOfDay: 'morning',
  captureType: 'front-selfie',
  atmosphericCondition: 'neutral',
  foregroundObstruction: 'clean',
  hasGlasses: false,
  handProp: 'none',
  outfitId: 'timeless12',
  hairStyle: 'h3',
  environmentRealism: 'طبيعية',
  lensCondition: 'modern-iphone',
  clothingCondition: 'crisp',
  gazeDirection: 'at-camera',
  facialHairState: '3-day-stubble',
  flashMode: 'no-flash',
  backgroundDynamics: 'empty',
  useDigitalZoom: false,
  framingImperfection: 'perfect',
  expression: 'e1',
  realismStyle: 'anti-ai-raw'
};

const makeRng = (seed = 123456789): (() => number) => {
  let value = seed >>> 0;
  return () => {
    value = (1664525 * value + 1013904223) >>> 0;
    return value / 0x100000000;
  };
};

describe('buildSmartComposition', () => {
  it('preserves manual appearance choices across many generated scenes', () => {
    const rng = makeRng();
    let state = initial;
    for (let i = 0; i < 500; i += 1) {
      state = buildSmartComposition(state, families, rng);
      expect(state.outfitId).toBe(initial.outfitId);
      expect(state.hairStyle).toBe(initial.hairStyle);
    }
  });

  it('preserves a manually selected front selfie across random compositions', () => {
    const rng = makeRng(17);
    let state = { ...initial, captureType: 'front-selfie' as const };

    for (let i = 0; i < 500; i += 1) {
      state = buildSmartComposition(state, families, rng);
      expect(state.captureType).toBe('front-selfie');
    }
  });

  it('preserves a manually selected third-person capture across random compositions', () => {
    const rng = makeRng(18);
    let state = { ...initial, captureType: 'third-person-candid' as const };

    for (let i = 0; i < 500; i += 1) {
      state = buildSmartComposition(state, families, rng);
      expect(state.captureType).toBe('third-person-candid');
    }
  });

  it('keeps mirror-selfie selected and randomizes only through compatible mirror sub-scenes', () => {
    const rng = makeRng(19);
    let state = {
      ...initial,
      sceneFamily: 'bedroom' as const,
      subScene: 'wardrobe-front' as const,
      captureType: 'mirror-selfie' as const
    };

    for (let i = 0; i < 200; i += 1) {
      state = buildSmartComposition(state, families, rng);
      expect(state.captureType).toBe('mirror-selfie');
      expect(state.sceneFamily).not.toBeNull();
      expect(getAllowedCaptureTypes(state.sceneFamily!, state.subScene).includes('mirror-selfie')).toBe(true);
    }
  });

  it('generates states that require no subsequent conflict repair', () => {
    const rng = makeRng(42);
    let state = initial;
    for (let i = 0; i < 500; i += 1) {
      state = buildSmartComposition(state, families, rng);
      const family = state.sceneFamily ? families[state.sceneFamily] : undefined;
      expect(resolveSceneConflicts(state, family)).toEqual(state);
      expect(state.useDigitalZoom && state.captureType !== 'third-person-candid').toBe(false);
      if (state.lightingMode === 'phone-screen') expect(state.flashMode).toBe('no-flash');
      if (state.handProp === 'adjusting-glasses') expect(state.hasGlasses).toBe(true);
    }
  });
});
