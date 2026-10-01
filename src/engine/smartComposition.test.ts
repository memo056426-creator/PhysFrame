import { describe, expect, it } from 'vitest';
import { buildSmartComposition, type SceneFamilyMap, type SmartCompositionState } from './smartComposition';
import { resolveSceneConflicts } from './rules';

const families: SceneFamilyMap = {
  'military-base': {
    subScenes: ['military-office', 'building-corridor', 'sector-emblem-wall', 'sector-parking'],
    activities: ['عمل مكتبي', 'استراحة قصيرة', 'مناوبة', 'واقف بثبات واعتزاز'],
    poses: ['واقف باستقامة', 'جالس خلف المكتب', 'مستند بظهره على مكتب', 'واقف بثبات'],
    allowedLighting: ['office-fluorescent', 'window-daylight', 'corridor-practical', 'midday-sun'],
    environmentRealism: ['رسمية ومنظمة', 'نشطة (عمل يومي)']
  },
  'saudi-outdoor': {
    subScenes: ['residential-villa-street', 'modern-residential-neighborhood', 'local-commercial-street', 'cafe-front', 'parking-lot', 'neighborhood-park', 'fitness-walkway'],
    activities: ['يمشي بهدوء', 'واقف بشكل طبيعي', 'ينتظر', 'جالس في المقهى'],
    poses: ['واقف بثبات', 'يمشي بخطوات طبيعية', 'مستند على جدار', 'مستند بظهره على الجدار', 'جالس على كرسي'],
    allowedLighting: ['natural-daylight', 'midday-sun', 'golden-hour', 'warm-street', 'commercial-neon'],
    environmentRealism: ['هادئ', 'طبيعي', 'نشط']
  },
  car: {
    subScenes: ['car-interior', 'beside-parked-car'],
    activities: ['خلف المقود والسيارة متوقفة', 'جالس في مقعد الراكب', 'جالس بهدوء داخل السيارة'],
    poses: ['جالس باسترخاء في المقعد', 'مستند على المقود'],
    allowedLighting: ['natural-daylight', 'midday-sun', 'vehicle-interior', 'street-through-glass', 'phone-screen'],
    environmentRealism: ['مرتبة', 'طبيعية', 'مستخدمة يوميًا']
  },
  'living-room': {
    subScenes: ['living-room-center', 'by-window', 'in-front-of-tv'],
    activities: ['جالس على الكنبة', 'واقف بشكل طبيعي', 'يشرب قهوة', 'يستخدم الهاتف'],
    poses: ['مسترخٍ على الكنبة', 'واقف بثبات', 'مستند على طاولة'],
    allowedLighting: ['natural-daylight', 'ceiling-practical', 'mixed-night', 'phone-screen'],
    environmentRealism: ['مرتبة', 'طبيعية', 'مستخدمة يوميًا']
  },
  bedroom: {
    subScenes: ['beside-bed', 'bed-edge', 'wardrobe-front', 'with-laptop'],
    activities: ['جالس', 'واقف بشكل طبيعي', 'مسترخٍ', 'يستخدم الهاتف'],
    poses: ['جالس على حافة السرير', 'نصف مستلقٍ', 'مستند على الجدار', 'واقف بثبات'],
    allowedLighting: ['natural-daylight', 'ceiling-practical', 'warm-lamp', 'phone-screen'],
    environmentRealism: ['مرتبة', 'طبيعية', 'مستخدمة يوميًا']
  },
  gym: {
    subScenes: ['beside-weights', 'mirror-area', 'equipment-area'],
    activities: ['قبل التمرين', 'يستريح بين الجولات', 'بعد التمرين'],
    poses: ['واقف بجانب الأجهزة', 'جالس على مقعد التمرين', 'يحمل زجاجة ماء'],
    allowedLighting: ['gym-practical', 'natural-daylight'],
    environmentRealism: ['هادئ', 'طبيعي', 'نشط']
  }
};

const initial: SmartCompositionState = {
  sceneFamily: 'bedroom',
  subScene: 'beside-bed',
  activity: 'جالس',
  pose: 'جالس على حافة السرير',
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
