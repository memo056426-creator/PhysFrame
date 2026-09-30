import { describe, expect, it } from 'vitest';
import { buildPhysicalProfile, lintPhysicalText, mergeFabricPhysics } from './physics';

describe('physics compiler', () => {
  it('injects front-selfie shoulder anatomy only for front selfie', () => {
    const selfie = buildPhysicalProfile({
      hasGlasses: false,
      clothingCondition: 'crisp',
      captureType: 'front-selfie',
      pose: 'واقف بثبات',
      handProp: 'none',
      facialHairState: '3-day-stubble'
    });
    expect(selfie.contactPhysics.join(' ')).toContain('asymmetrical shoulder elevation');

    const candid = buildPhysicalProfile({
      hasGlasses: false,
      clothingCondition: 'crisp',
      captureType: 'third-person-candid',
      pose: 'واقف بثبات',
      handProp: 'none',
      facialHairState: '3-day-stubble'
    });
    expect(candid.contactPhysics.join(' ')).not.toContain('asymmetrical shoulder elevation');
  });

  it('does not emit eyewear physics when glasses are disabled', () => {
    const profile = buildPhysicalProfile({
      hasGlasses: false,
      clothingCondition: 'crisp',
      captureType: 'front-selfie',
      pose: 'واقف بثبات',
      handProp: 'none',
      facialHairState: 'clean-shaven'
    });
    expect(profile.eyewearLensEffects).toEqual([]);
    expect(profile.realismConstraints.join(' ')).not.toMatch(/eyeglass|glasses/i);
  });

  it('normalizes absolute wrinkle-free outfit language before combining global fabric realism', () => {
    const merged = mergeFabricPhysics(
      ['very soft drape', 'smooth wrinkle-free fall'],
      ['non-uniform physically plausible micro-wrinkles and pressure creases instead of perfectly smoothed cloth']
    );
    expect(merged.text).not.toMatch(/wrinkle[- ]?free/i);
    expect(merged.text).toContain('subtle gravity creases');
    expect(merged.warnings).toContain('fabric:absolute-wrinkle-free-normalized');
  });

  it('detects leaked selfie anatomy and eyewear physics', () => {
    expect(lintPhysicalText('eyeglass frame reflection', { hasGlasses: false, captureType: 'third-person-candid' }))
      .toContain('physics:eyewear-leak-without-glasses');
    expect(lintPhysicalText('asymmetrical shoulder elevation on camera-holding side', { hasGlasses: false, captureType: 'third-person-candid' }))
      .toContain('physics:selfie-anatomy-outside-front-selfie');
  });

  it('preserves biological hair density language', () => {
    const profile = buildPhysicalProfile({
      hasGlasses: false,
      clothingCondition: 'crisp',
      captureType: 'front-selfie',
      pose: 'واقف بثبات',
      handProp: 'none',
      facialHairState: '3-day-stubble'
    });
    expect(profile.hairCondition).toContain('exact biological hair density');
    expect(profile.hairCondition).toContain('DO NOT artificially thicken hair');
  });
});
