import { describe, expect, it } from 'vitest';
import { buildGroupSelfieProfile, lintGroupSelfieText } from './groupSelfie';

describe('group selfie architecture', () => {
  it('stays inactive when disabled', () => {
    const profile = buildGroupSelfieProfile({ enabled: false, companionCount: 2, captureType: 'front-selfie' });
    expect(profile.active).toBe(false);
    expect(profile.styleConstraints).toEqual([]);
  });

  it('compiles shooter geometry, identity separation, limb integrity and candid dynamics', () => {
    const profile = buildGroupSelfieProfile({ enabled: true, companionCount: 3, captureType: 'front-selfie' });
    const text = [
      profile.captureMechanics,
      profile.identityRules,
      profile.anatomyRules,
      profile.dynamicsRules,
      profile.lensDescriptor,
      ...profile.styleConstraints
    ].join(' ');

    expect(profile.active).toBe(true);
    expect(profile.cameraDistance).toContain('45-65cm');
    expect(text).toMatch(/21-24mm/i);
    expect(text).toMatch(/STRICTLY NO external photographer/i);
    expect(text).toMatch(/100% strictly biometrically locked/i);
    expect(text).toMatch(/REFERENCE-IDENTITY FIREWALL/i);
    expect(text).toMatch(/reference image applies EXCLUSIVELY to the PRIMARY SUBJECT/i);
    expect(text).toMatch(/COMPANION A \[/i);
    expect(text).toMatch(/COMPANION B \[/i);
    expect(text).toMatch(/COMPANION C \[/i);
    expect(text).toMatch(/at least FOUR major biometric dimensions/i);
    expect(text).toMatch(/SPATIAL IDENTITY LOCK/i);
    expect(text).toMatch(/ZERO CLONED FACES/i);
    expect(text).toMatch(/Every visible hand, wrist, forearm/i);
    expect(text).toMatch(/phone-screen preview/i);
    expect(text).toMatch(/mid-laugh/i);
    expect(lintGroupSelfieText(text, { enabled: true, companionCount: 3, captureType: 'front-selfie' })).toEqual([]);
  });

  it('only emits identity slots that actually exist in the group', () => {
    const one = buildGroupSelfieProfile({ enabled: true, companionCount: 1, captureType: 'front-selfie' });
    expect(one.identityRules).toMatch(/COMPANION A \[/i);
    expect(one.identityRules).not.toMatch(/COMPANION B \[/i);
    expect(one.identityRules).not.toMatch(/COMPANION C \[/i);

    const two = buildGroupSelfieProfile({ enabled: true, companionCount: 2, captureType: 'front-selfie' });
    expect(two.identityRules).toMatch(/COMPANION A \[/i);
    expect(two.identityRules).toMatch(/COMPANION B \[/i);
    expect(two.identityRules).not.toMatch(/COMPANION C \[/i);
  });

  it('varies companion dynamics by count', () => {
    const one = buildGroupSelfieProfile({ enabled: true, companionCount: 1, captureType: 'front-selfie' });
    const two = buildGroupSelfieProfile({ enabled: true, companionCount: 2, captureType: 'front-selfie' });
    expect(one.dynamicsRules).toMatch(/The companion leans/i);
    expect(two.dynamicsRules).toMatch(/one checks the phone-screen preview/i);
  });

  it('warns if group mode is paired with a non-front capture type', () => {
    const warnings = lintGroupSelfieText('', { enabled: true, companionCount: 2, captureType: 'third-person-candid' });
    expect(warnings).toContain('group-selfie:requires-front-selfie');
  });
});
