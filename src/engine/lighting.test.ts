import { describe, expect, it } from 'vitest';
import { getLightingProfile, resolveLightingCompatibility } from './lighting';

describe('typed lighting resolver', () => {
  it('forces phone-screen-only scenes to night without changing the selected light', () => {
    const result = resolveLightingCompatibility({
      lightingMode: 'إضاءة شاشة الهاتف فقط',
      allowedLighting: ['ضوء نهاري طبيعي', 'إضاءة سقف', 'إضاءة شاشة الهاتف فقط'],
      timeOfDay: 'midday'
    });

    expect(result.timeOfDay).toBe('night');
    expect(result.lightingMode).toBe('إضاءة شاشة الهاتف فقط');
    expect(result.profile.soleAmbientSource).toBe(true);
  });

  it('replaces daylight with a compatible practical when the scene is night', () => {
    const result = resolveLightingCompatibility({
      lightingMode: 'ضوء نهاري طبيعي',
      allowedLighting: ['ضوء نهاري طبيعي', 'إضاءة سقف', 'إنارة ليلية مختلطة', 'إضاءة شاشة الهاتف فقط'],
      timeOfDay: 'night'
    });

    expect(result.timeOfDay).toBe('night');
    expect(['إضاءة سقف', 'إنارة ليلية مختلطة', 'إضاءة شاشة الهاتف فقط']).toContain(result.lightingMode);
  });

  it('prefers golden hour when sunset conflicts with midday sun', () => {
    const result = resolveLightingCompatibility({
      lightingMode: 'شمس الظهر',
      allowedLighting: ['ضوء نهاري طبيعي', 'شمس الظهر', 'ساعة ذهبية (شروق/غروب)', 'إنارة شارع دافئة'],
      timeOfDay: 'sunset'
    });

    expect(result.lightingMode).toBe('ساعة ذهبية (شروق/غروب)');
  });

  it('keeps a valid manual choice unchanged', () => {
    const result = resolveLightingCompatibility({
      lightingMode: 'إضاءة مكتب فلورسنت',
      allowedLighting: ['إضاءة مكتب فلورسنت', 'ضوء نهاري من النافذة'],
      timeOfDay: 'midday'
    });

    expect(result.changed).toBe(false);
    expect(result.lightingMode).toBe('إضاءة مكتب فلورسنت');
  });

  it('provides explicit physics for all known lighting labels', () => {
    const profile = getLightingProfile('إضاءة أباجورة دافئة');
    expect(profile.kind).toBe('warm-lamp');
    expect(profile.ambientDescription.length).toBeGreaterThan(30);
    expect(profile.shadowDescription.length).toBeGreaterThan(20);
  });
});
