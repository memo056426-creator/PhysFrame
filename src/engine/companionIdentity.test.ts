import { describe, expect, it } from 'vitest';
import { buildCompanionIdentityPlan, lintCompanionIdentityText } from './companionIdentity';

describe('companion identity separation engine', () => {
  it('creates deterministic, spatially locked and morphologically distinct slots', () => {
    const plan = buildCompanionIdentityPlan(3);
    expect(plan.slots).toHaveLength(3);
    expect(new Set(plan.slots.map(slot => slot.faceShape)).size).toBe(3);
    expect(new Set(plan.slots.map(slot => slot.jawGeometry)).size).toBe(3);
    expect(new Set(plan.slots.map(slot => slot.eyeGeometry)).size).toBe(3);
    expect(new Set(plan.slots.map(slot => slot.noseGeometry)).size).toBe(3);
    expect(new Set(plan.slots.map(slot => slot.hairGeometry)).size).toBe(3);
    expect(new Set(plan.slots.map(slot => slot.facialHair)).size).toBe(3);
    expect(new Set(plan.slots.map(slot => slot.spatialAnchor)).size).toBe(3);
  });

  it('protects companions from reference-face leakage', () => {
    const plan = buildCompanionIdentityPlan(2);
    const text = [
      plan.referenceIsolationRule,
      plan.pairwiseSeparationRule,
      plan.spatialLockRule,
      plan.slotDescriptions
    ].join(' ');

    expect(text).toMatch(/applies EXCLUSIVELY to the PRIMARY SUBJECT/i);
    expect(text).toMatch(/NEVER copy, interpolate, remix, inherit, average, or transfer/i);
    expect(text).toMatch(/at least FOUR major biometric dimensions/i);
    expect(text).toMatch(/SPATIAL IDENTITY LOCK/i);
    expect(lintCompanionIdentityText(text, 2)).toEqual([]);
  });

  it('emits only the requested number of companion identities', () => {
    const one = buildCompanionIdentityPlan(1);
    expect(one.slotDescriptions).toMatch(/COMPANION A \[/i);
    expect(one.slotDescriptions).not.toMatch(/COMPANION B \[/i);

    const three = buildCompanionIdentityPlan(3);
    expect(three.slotDescriptions).toMatch(/COMPANION A \[/i);
    expect(three.slotDescriptions).toMatch(/COMPANION B \[/i);
    expect(three.slotDescriptions).toMatch(/COMPANION C \[/i);
  });

  it('includes anti-lookalike negative constraints', () => {
    const plan = buildCompanionIdentityPlan(3);
    expect(plan.negativeConstraints).toEqual(expect.arrayContaining([
      'lookalike companions',
      'sibling-like faces',
      'identity blending',
      'reference-face leakage into companions',
      'same hairline on multiple people',
      'same beard pattern on multiple people'
    ]));
  });
});
