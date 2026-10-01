import { describe, expect, it, vi } from 'vitest';
import { getActivityLabel } from '../data/activities';
import { getPoseLabel } from '../data/poses';
import { DEFAULT_STATE, normalizeSceneState } from '../state/sceneState';
import type { SceneState } from '../types/scene';
import { getLightingProfile } from './lighting';
import { buildPromptText } from './promptText';
import { deriveRealismState } from './realismState';
import { buildSemanticScene } from './semanticScene';

interface BenchmarkScenario {
  name: string;
  state: Partial<SceneState>;
  expectedState?: Partial<SceneState>;
  mustContain: readonly string[];
}

const BENCHMARK_SCENARIOS: readonly BenchmarkScenario[] = [
  {
    name: 'bedroom phone-screen seated selfie',
    state: {
      sceneFamily: 'bedroom',
      subScene: 'beside-bed',
      activity: 'using-phone',
      pose: 'seated-on-bed-edge',
      captureType: 'front-selfie',
      timeOfDay: 'night',
      lightingMode: 'phone-screen',
      outfitId: 'cas1'
    },
    expectedState: { captureType: 'front-selfie', lightingMode: 'phone-screen' },
    mustContain: ['Smartphone front-camera selfie', 'natural weight distribution']
  },
  {
    name: 'bedroom wardrobe mirror selfie',
    state: {
      sceneFamily: 'bedroom',
      subScene: 'wardrobe-front',
      activity: 'standing-natural',
      pose: 'standing-steady',
      captureType: 'mirror-selfie',
      timeOfDay: 'night',
      lightingMode: 'warm-lamp',
      outfitId: 'cas1'
    },
    expectedState: { captureType: 'mirror-selfie', lightingMode: 'warm-lamp' },
    mustContain: ['Smartphone mirror selfie', 'geometrically accurate mirror reflection']
  },
  {
    name: 'parked car driver daylight selfie',
    state: {
      sceneFamily: 'car',
      subScene: 'car-interior',
      activity: 'parked-behind-wheel',
      pose: 'relaxed-in-seat',
      captureType: 'front-selfie',
      timeOfDay: 'midday',
      lightingMode: 'vehicle-day-through-glass'
    },
    expectedState: { captureType: 'front-selfie', lightingMode: 'vehicle-day-through-glass' },
    mustContain: ['Smartphone front-camera selfie', 'windshield and side glass', 'premium dark leather seat texture', 'natural weight distribution']
  },
  {
    name: 'car cabin night candid through glass',
    state: {
      sceneFamily: 'car',
      subScene: 'car-interior',
      activity: 'seated-calm-in-car',
      pose: 'relaxed-in-seat',
      captureType: 'third-person-candid',
      timeOfDay: 'night',
      lightingMode: 'street-through-glass',
      foregroundObstruction: 'clean'
    },
    expectedState: { captureType: 'third-person-candid', foregroundObstruction: 'through-glass', lightingMode: 'street-through-glass' },
    mustContain: ['Third-person candid photograph', 'premium dark leather seat texture', 'natural weight distribution']
  },
  {
    name: 'Saudi outdoor midday candid',
    state: {
      sceneFamily: 'saudi-outdoor',
      subScene: 'parking-lot',
      activity: 'standing-natural',
      pose: 'standing-steady',
      captureType: 'third-person-candid',
      timeOfDay: 'midday',
      lightingMode: 'midday-sun',
      outfitId: 'cas1'
    },
    expectedState: { captureType: 'third-person-candid', lightingMode: 'midday-sun' },
    mustContain: ['Third-person candid photograph', 'Harsh direct midday sunlight', 'realistic pavement']
  },
  {
    name: 'Saudi cafe golden-hour seated selfie',
    state: {
      sceneFamily: 'saudi-outdoor',
      subScene: 'cafe-front',
      activity: 'seated-at-cafe',
      pose: 'seated-on-chair',
      captureType: 'front-selfie',
      timeOfDay: 'sunset',
      lightingMode: 'golden-hour',
      handProp: 'coffee-cup',
      outfitId: 'cas1'
    },
    expectedState: { captureType: 'front-selfie', lightingMode: 'golden-hour' },
    mustContain: ['Smartphone front-camera selfie', 'Low-angle warm sunrise or sunset light', 'holding coffee cup', 'natural weight distribution']
  },
  {
    name: 'living-room window daylight candid',
    state: {
      sceneFamily: 'living-room',
      subScene: 'by-window',
      activity: 'drinking-coffee',
      pose: 'relaxed-on-sofa',
      captureType: 'third-person-candid',
      timeOfDay: 'morning',
      lightingMode: 'window-daylight',
      handProp: 'coffee-cup',
      outfitId: 'cas1'
    },
    expectedState: { captureType: 'third-person-candid', lightingMode: 'window-daylight' },
    mustContain: ['Third-person candid photograph', 'Directional natural daylight entering from a real side window', 'holding coffee cup']
  },
  {
    name: 'night living-room selfie with glasses and direct flash',
    state: {
      sceneFamily: 'living-room',
      subScene: 'living-room-center',
      activity: 'standing-natural',
      pose: 'standing-steady',
      captureType: 'front-selfie',
      timeOfDay: 'night',
      lightingMode: 'mixed-night',
      hasGlasses: true,
      flashMode: 'direct-flash',
      outfitId: 'cas1'
    },
    expectedState: { captureType: 'front-selfie', hasGlasses: true, flashMode: 'direct-flash' },
    mustContain: ['Smartphone front-camera selfie', 'Direct on-axis smartphone flash', 'STRICTLY preserve the exact same frame shape']
  },
  {
    name: 'gym post-workout mirror selfie',
    state: {
      sceneFamily: 'gym',
      subScene: 'mirror-area',
      activity: 'post-workout',
      pose: 'standing-by-equipment',
      captureType: 'mirror-selfie',
      timeOfDay: 'midday',
      lightingMode: 'gym-practical',
      outfitId: 'gym1',
      hairStyle: 'h5',
      atmosphericCondition: 'high-humidity'
    },
    expectedState: { captureType: 'mirror-selfie', lightingMode: 'gym-practical' },
    mustContain: ['Smartphone mirror selfie', 'slightly sweat-dampened post-workout hair', 'geometrically accurate mirror reflection']
  },
  {
    name: 'military office seated candid',
    state: {
      sceneFamily: 'military-base',
      subScene: 'military-office',
      activity: 'military-office-work',
      pose: 'seated-behind-desk',
      captureType: 'third-person-candid',
      timeOfDay: 'midday',
      lightingMode: 'office-fluorescent',
      outfitId: 'mil3'
    },
    expectedState: { captureType: 'third-person-candid', lightingMode: 'office-fluorescent' },
    mustContain: ['Third-person candid photograph', 'Cool overhead fluorescent office illumination', 'natural weight distribution', 'official institutional document folders']
  },
  {
    name: 'military corridor night front selfie',
    state: {
      sceneFamily: 'military-base',
      subScene: 'building-corridor',
      activity: 'on-duty',
      pose: 'standing-upright',
      captureType: 'front-selfie',
      timeOfDay: 'night',
      lightingMode: 'corridor-practical',
      outfitId: 'mil3'
    },
    expectedState: { captureType: 'front-selfie', lightingMode: 'corridor-practical' },
    mustContain: ['Smartphone front-camera selfie', 'Repeated overhead corridor practical lights']
  },
  {
    name: 'Saudi outdoor three-person group selfie',
    state: {
      sceneFamily: 'saudi-outdoor',
      subScene: 'neighborhood-park',
      activity: 'waiting',
      pose: 'standing-steady',
      captureType: 'front-selfie',
      timeOfDay: 'midday',
      lightingMode: 'open-shade',
      groupSelfieEnabled: true,
      groupSelfieCompanionCount: 2,
      outfitId: 'cas1'
    },
    expectedState: { captureType: 'front-selfie', groupSelfieEnabled: true, groupSelfieCompanionCount: 2 },
    mustContain: ['STRICT ZERO CLONED FACES', 'Group anatomical integrity', 'Open-shade daylight']
  }
];

const buildScenario = (overrides: Partial<SceneState>) => {
  const state = normalizeSceneState({ ...DEFAULT_STATE, ...overrides });
  const derived = deriveRealismState(state);
  const semantic = buildSemanticScene(state, derived);

  return {
    state,
    chatgpt: buildPromptText(semantic, 'chatgpt', state),
    gemini: buildPromptText(semantic, 'gemini', state)
  };
};

const expectNoDomainValueLeak = (text: string, state: SceneState) => {
  if (state.pose) expect(text).not.toContain(`Pose: ${state.pose}`);
  if (state.activity) expect(text).not.toContain(`Activity: ${state.activity}`);
  if (state.lightingMode !== 'unknown') expect(text).not.toContain(`Lighting source: ${state.lightingMode}`);
  if (state.subScene) expect(text).not.toContain(`Location: ordinary realistic ${state.subScene} setting`);
};

describe('canonical prompt quality benchmark', () => {
  it('covers a meaningful cross-section of real PhysFrame scenes', () => {
    expect(BENCHMARK_SCENARIOS.length).toBeGreaterThanOrEqual(10);
    expect(new Set(BENCHMARK_SCENARIOS.map(item => item.state.sceneFamily)).size).toBe(6);
  });

  for (const scenario of BENCHMARK_SCENARIOS) {
    it(`${scenario.name} preserves its prompt contracts`, () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { state, chatgpt, gemini } = buildScenario(scenario.state);
      const warnings = warn.mock.calls.flat().map(String);
      warn.mockRestore();

      expect(warnings).toEqual([]);
      expect(state.sceneFamily).not.toBeNull();

      for (const [key, value] of Object.entries(scenario.expectedState ?? {})) {
        expect(state[key as keyof SceneState]).toEqual(value);
      }

      expect(chatgpt).toContain('CRITICAL INSTRUCTION: Generate a raw, unedited, authentic smartphone snapshot.');
      expect(gemini).toContain('Create a highly realistic, raw smartphone photograph');

      for (const prompt of [chatgpt, gemini]) {
        expect(prompt.length).toBeGreaterThan(500);
        expect(prompt).toContain('Preserve exact facial identity from the reference image.');
        expect(prompt).not.toMatch(/undefined|NaN|\[object Object\]/);

        if (state.pose) expect(prompt).toContain(getPoseLabel(state.pose));
        if (state.activity) expect(prompt).toContain(getActivityLabel(state.activity));
        if (state.lightingMode !== 'unknown') {
          expect(prompt).toContain(getLightingProfile(state.lightingMode).labelAR);
        }
        expectNoDomainValueLeak(prompt, state);

        for (const required of scenario.mustContain) expect(prompt).toContain(required);
      }
    });
  }
});
