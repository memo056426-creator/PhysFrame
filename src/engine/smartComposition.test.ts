import { describe, expect, it } from 'vitest';
import { buildSmartComposition, type SceneFamilyMap, type SmartCompositionState } from './smartComposition';
import { resolveSceneConflicts } from './rules';

const families: SceneFamilyMap = {
  'military-base': {
    subScenes: ['مكتب إداري عسكري', 'ممرات المبنى', 'أمام لوحة شعار القطاع', 'مواقف سيارات القطاع'],
    activities: ['عمل مكتبي', 'استراحة قصيرة', 'مناوبة', 'واقف بثبات واعتزاز'],
    poses: ['واقف باستقامة', 'جالس خلف المكتب', 'مستند بظهره على مكتب', 'واقف بثبات'],
    allowedLighting: ['إضاءة مكتب فلورسنت', 'ضوء نهاري من النافذة', 'إضاءة ممرات متوازية', 'شمس الظهر'],
    environmentRealism: ['رسمية ومنظمة', 'نشطة (عمل يومي)']
  },
  'saudi-outdoor': {
    subScenes: ['شارع فلل سكني', 'حي سكني حديث', 'شارع تجاري محلي', 'أمام مقهى', 'موقف سيارات', 'حديقة حي عامة', 'ممشى رياضي'],
    activities: ['يمشي بهدوء', 'واقف بشكل طبيعي', 'ينتظر', 'جالس في المقهى'],
    poses: ['واقف بثبات', 'يمشي بخطوات طبيعية', 'مستند على جدار', 'مستند بظهره على الجدار', 'جالس على كرسي'],
    allowedLighting: ['ضوء نهاري طبيعي', 'شمس الظهر', 'ساعة ذهبية (شروق/غروب)', 'إنارة شارع دافئة', 'إنارة نيون تجارية متناثرة'],
    environmentRealism: ['هادئ', 'طبيعي', 'نشط']
  },
  car: {
    subScenes: ['داخل السيارة', 'بجانب السيارة متوقفة'],
    activities: ['خلف المقود والسيارة متوقفة', 'جالس في مقعد الراكب', 'جالس بهدوء داخل السيارة'],
    poses: ['جالس باسترخاء في المقعد', 'مستند على المقود'],
    allowedLighting: ['ضوء نهاري طبيعي', 'شمس الظهر', 'إضاءة داخل السيارة', 'إضاءة الشارع عبر زجاج السيارة', 'إضاءة شاشة الهاتف فقط'],
    environmentRealism: ['مرتبة', 'طبيعية', 'مستخدمة يوميًا']
  },
  'living-room': {
    subScenes: ['في منتصف الصالة', 'بجانب النافذة', 'أمام التلفاز'],
    activities: ['جالس على الكنبة', 'واقف بشكل طبيعي', 'يشرب قهوة', 'يستخدم الهاتف'],
    poses: ['مسترخٍ على الكنبة', 'واقف بثبات', 'مستند على طاولة'],
    allowedLighting: ['ضوء نهاري طبيعي', 'إضاءة سقف', 'إنارة ليلية مختلطة', 'إضاءة شاشة الهاتف فقط'],
    environmentRealism: ['مرتبة', 'طبيعية', 'مستخدمة يوميًا']
  },
  bedroom: {
    subScenes: ['بجانب السرير', 'على حافة السرير', 'أمام الدولاب', 'مع اللابتوب'],
    activities: ['جالس', 'واقف بشكل طبيعي', 'مسترخٍ', 'يستخدم الهاتف'],
    poses: ['جالس على حافة السرير', 'نصف مستلقٍ', 'مستند على الجدار', 'واقف بثبات'],
    allowedLighting: ['ضوء نهاري طبيعي', 'إضاءة سقف', 'إضاءة أباجورة دافئة', 'إضاءة شاشة الهاتف فقط'],
    environmentRealism: ['مرتبة', 'طبيعية', 'مستخدمة يوميًا']
  },
  gym: {
    subScenes: ['بجانب الأثقال', 'أمام المرآة', 'في منطقة الأجهزة'],
    activities: ['قبل التمرين', 'يستريح بين الجولات', 'بعد التمرين'],
    poses: ['واقف بجانب الأجهزة', 'جالس على مقعد التمرين', 'يحمل زجاجة ماء'],
    allowedLighting: ['إضاءة النادي الرياضي', 'ضوء نهاري طبيعي'],
    environmentRealism: ['هادئ', 'طبيعي', 'نشط']
  }
};

const initial: SmartCompositionState = {
  sceneFamily: 'bedroom',
  subScene: 'بجانب السرير',
  activity: 'جالس',
  pose: 'جالس على حافة السرير',
  lightingMode: 'ضوء نهاري طبيعي',
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
      if (state.lightingMode === 'إضاءة شاشة الهاتف فقط') expect(state.flashMode).toBe('no-flash');
      if (state.handProp === 'adjusting-glasses') expect(state.hasGlasses).toBe(true);
    }
  });
});
