import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE } from '../state/sceneState';
import { buildSceneFacts, resolveVehicleRoleFromState } from './sceneFacts';

describe('typed scene facts', () => {
  it('derives front-selfie and phone-screen invariants from state', () => {
    const facts = buildSceneFacts({
      ...DEFAULT_STATE,
      captureType: 'front-selfie',
      lightingMode: 'phone-screen',
      timeOfDay: 'night',
      handProp: 'phone'
    });

    expect(facts.captureType).toBe('front-selfie');
    expect(facts.selfieArmGeometryRequired).toBe(true);
    expect(facts.mirrorReflectionRequired).toBe(false);
    expect(facts.externalPhotographer).toBe(false);
    expect(facts.lightingSoleAmbientSource).toBe(true);
    expect(facts.visiblePhoneRequested).toBe(true);
    expect(facts.visiblePhoneAllowed).toBe(false);
  });

  it('derives mirror reflection without front-selfie arm geometry', () => {
    const facts = buildSceneFacts({
      ...DEFAULT_STATE,
      captureType: 'mirror-selfie'
    });

    expect(facts.mirrorReflectionRequired).toBe(true);
    expect(facts.selfieArmGeometryRequired).toBe(false);
    expect(facts.visiblePhoneAllowed).toBe(true);
  });

  it('derives an external photographer only for third-person candid capture', () => {
    const facts = buildSceneFacts({
      ...DEFAULT_STATE,
      captureType: 'third-person-candid'
    });

    expect(facts.externalPhotographer).toBe(true);
    expect(facts.selfieArmGeometryRequired).toBe(false);
    expect(facts.mirrorReflectionRequired).toBe(false);
  });

  it('derives the LHD driver role from typed scene state rather than prompt wording', () => {
    const state = {
      ...DEFAULT_STATE,
      sceneFamily: 'car' as const,
      activity: 'parked-behind-wheel' as const
    };
    const facts = buildSceneFacts(state);

    expect(facts.vehicleRole).toBe('driver');
    expect(facts.vehicleDriveSide).toBe('lhd');
  });

  it('does not invent a driver role for passenger or non-car scenes', () => {
    expect(resolveVehicleRoleFromState({
      ...DEFAULT_STATE,
      sceneFamily: 'car',
      activity: 'passenger-seat'
    })).toBe('front-passenger');

    expect(resolveVehicleRoleFromState({
      ...DEFAULT_STATE,
      sceneFamily: 'bedroom',
      activity: 'parked-behind-wheel'
    })).toBe('none');
  });
});
