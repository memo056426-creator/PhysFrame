import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE, normalizeSceneState } from './sceneState';

describe('sceneState', () => {
  it('returns defaults for invalid non-object input', () => {
    const state = normalizeSceneState(null);
    expect(state.captureType).toBe(DEFAULT_STATE.captureType);
    expect(state.outfitId).toBe(DEFAULT_STATE.outfitId);
    expect(state.backgroundDynamics).toBe(DEFAULT_STATE.backgroundDynamics);
  });

  it('migrates legacy background dynamics values', () => {
    expect(normalizeSceneState({ backgroundDynamics: 'empty-still' }).backgroundDynamics).toBe('empty');
    expect(normalizeSceneState({ backgroundDynamics: 'casual-indifferent' }).backgroundDynamics).toBe('casual');
    expect(normalizeSceneState({ backgroundDynamics: 'busy-motion' }).backgroundDynamics).toBe('busy');
  });

  it('falls back from invalid enum-like values', () => {
    const state = normalizeSceneState({
      sceneFamily: 'unknown-place',
      captureType: 'floating-camera',
      framing: 'ultra-wide',
      cameraAngle: 'impossible-angle',
      timeOfDay: 'blue-hour',
      realismStyle: 'glossy-ai',
      framingImperfection: 'broken-frame',
      groupSelfieCompanionCount: 9
    });

    expect(state.sceneFamily).toBeNull();
    expect(state.captureType).toBe(DEFAULT_STATE.captureType);
    expect(state.framing).toBe(DEFAULT_STATE.framing);
    expect(state.cameraAngle).toBe(DEFAULT_STATE.cameraAngle);
    expect(state.timeOfDay).toBe(DEFAULT_STATE.timeOfDay);
    expect(state.realismStyle).toBe(DEFAULT_STATE.realismStyle);
    expect(state.framingImperfection).toBe(DEFAULT_STATE.framingImperfection);
    expect(state.groupSelfieCompanionCount).toBe(DEFAULT_STATE.groupSelfieCompanionCount);
  });

  it('normalizes persisted boolean-like fields consistently', () => {
    const state = normalizeSceneState({
      hasGlasses: 1,
      useDigitalZoom: 'yes',
      groupSelfieEnabled: 0
    });

    expect(state.hasGlasses).toBe(true);
    expect(state.useDigitalZoom).toBe(true);
    expect(state.groupSelfieEnabled).toBe(false);
  });

  it('falls back when persisted catalog ids no longer exist', () => {
    const state = normalizeSceneState({
      outfitId: 'missing-outfit',
      hairStyle: 'missing-hair',
      expression: 'missing-expression'
    });

    expect(state.outfitId).toBe(DEFAULT_STATE.outfitId);
    expect(state.hairStyle).toBe(DEFAULT_STATE.hairStyle);
    expect(state.expression).toBe(DEFAULT_STATE.expression);
  });
});
