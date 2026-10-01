import { describe, expect, it } from 'vitest';
import {
  getCompatibleLightingSuggestions,
  getLightingProfile,
  getSceneLightingLabels,
  getSmartDayTime,
  getSmartLightingSuggestions,
  resolveLightingCompatibility,
  resolveLightingKind
} from './lighting';

describe('typed lighting resolver', () => {
  it('forces phone-screen-only scenes to night without changing the selected light', () => {
    const result = resolveLightingCompatibility({
      lightingMode: 'phone-screen',
      allowedLighting: ['natural-daylight', 'ceiling-practical', 'phone-screen'],
      timeOfDay: 'midday'
    });

    expect(result.timeOfDay).toBe('night');
    expect(result.lightingMode).toBe('phone-screen');
    expect(result.profile.soleAmbientSource).toBe(true);
  });

  it('replaces daylight with a compatible practical when the scene is night', () => {
    const result = resolveLightingCompatibility({
      lightingMode: 'natural-daylight',
      allowedLighting: ['natural-daylight', 'ceiling-practical', 'mixed-night', 'phone-screen'],
      timeOfDay: 'night'
    });

    expect(result.timeOfDay).toBe('night');
    expect(['ceiling-practical', 'mixed-night', 'phone-screen']).toContain(result.lightingMode);
  });

  it('prefers golden hour when sunset conflicts with midday sun', () => {
    const result = resolveLightingCompatibility({
      lightingMode: 'midday-sun',
      allowedLighting: ['natural-daylight', 'midday-sun', 'golden-hour', 'warm-street'],
      timeOfDay: 'sunset'
    });

    expect(result.lightingMode).toBe('golden-hour');
  });

  it('keeps a valid manual choice unchanged', () => {
    const result = resolveLightingCompatibility({
      lightingMode: 'office-fluorescent',
      allowedLighting: ['office-fluorescent', 'window-daylight'],
      timeOfDay: 'midday'
    });

    expect(result.changed).toBe(false);
    expect(result.lightingMode).toBe('office-fluorescent');
  });

  it('migrates legacy Arabic labels to stable machine ids', () => {
    expect(resolveLightingKind('إضاءة شاشة الهاتف فقط')).toBe('phone-screen');
    expect(resolveLightingKind('warm-lamp')).toBe('warm-lamp');
    expect(resolveLightingKind('قيمة قديمة غير معروفة')).toBe('unknown');
  });

  it('provides explicit physics for all known lighting ids', () => {
    const profile = getLightingProfile('warm-lamp');
    expect(profile.kind).toBe('warm-lamp');
    expect(profile.ambientDescription.length).toBeGreaterThan(30);
    expect(profile.shadowDescription.length).toBeGreaterThan(20);
  });

  it('reads an interior car scene and recommends through-glass daylight during daytime', () => {
    const suggestions = getSmartLightingSuggestions({
      sceneFamily: 'car',
      subScene: 'داخل السيارة',
      timeOfDay: 'afternoon',
      activity: 'خلف المقود والسيارة متوقفة'
    });

    expect(suggestions[0]?.labelAR).toBe('ضوء نهاري عبر زجاج السيارة');
    expect(suggestions.every(item => item.profile.compatibleTimes.includes('afternoon'))).toBe(true);
  });

  it('reads an interior car scene and recommends exterior/cabin physical sources at night', () => {
    const suggestions = getSmartLightingSuggestions({
      sceneFamily: 'car',
      subScene: 'داخل السيارة',
      timeOfDay: 'night',
      activity: 'جالس بهدوء داخل السيارة'
    });

    expect(['إضاءة الشارع عبر زجاج السيارة', 'إضاءة عدادات السيارة الخافتة', 'إضاءة داخل السيارة']).toContain(suggestions[0]?.labelAR);
    expect(suggestions.some(item => item.labelAR === 'شمس الظهر')).toBe(false);
  });

  it('recognizes a military corridor and elevates corridor practical lighting', () => {
    const suggestions = getSmartLightingSuggestions({
      sceneFamily: 'military-base',
      subScene: 'ممرات المبنى',
      timeOfDay: 'night',
      activity: 'مناوبة'
    });

    expect(suggestions[0]?.labelAR).toBe('إضاءة ممرات متوازية');
  });

  it('recognizes a cafe at night and surfaces storefront spill', () => {
    const suggestions = getSmartLightingSuggestions({
      sceneFamily: 'saudi-outdoor',
      subScene: 'أمام مقهى',
      timeOfDay: 'night',
      activity: 'جالس في المقهى'
    });

    expect(suggestions.slice(0, 3).map(item => item.labelAR)).toContain('توهج واجهة متجر أو مقهى');
  });

  it('recognizes a living-room TV scene and recommends TV spill at night', () => {
    const suggestions = getSmartLightingSuggestions({
      sceneFamily: 'living-room',
      subScene: 'أمام التلفاز',
      timeOfDay: 'night',
      activity: 'جالس على الكنبة'
    });

    expect(suggestions[0]?.labelAR).toBe('وهج تلفاز خافت');
  });

  it('exposes a richer compatible lighting catalog without leaking outdoor sun into a bedroom', () => {
    const labels = getSceneLightingLabels('bedroom', 'بجانب السرير');
    expect(labels).toContain('ضوء نافذة منتشر عبر ستارة');
    expect(labels).toContain('ضوء ممر دافئ من الباب');
    expect(labels).not.toContain('شمس الظهر');
  });

  it('returns all compatible options ordered by recommendation score', () => {
    const suggestions = getCompatibleLightingSuggestions({
      sceneFamily: 'saudi-outdoor',
      subScene: 'شارع فلل سكني',
      timeOfDay: 'night'
    });

    expect(suggestions.length).toBeGreaterThan(2);
    for (let i = 1; i < suggestions.length; i += 1) {
      expect(suggestions[i - 1].score).toBeGreaterThanOrEqual(suggestions[i].score);
    }
  });

  it('chooses a sensible smart daytime phase by scene context', () => {
    expect(getSmartDayTime('bedroom', 'بجانب السرير')).toBe('morning');
    expect(getSmartDayTime('car', 'داخل السيارة')).toBe('afternoon');
    expect(getSmartDayTime('military-base', 'مواقف سيارات القطاع')).toBe('midday');
  });
});
