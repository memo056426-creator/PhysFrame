import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE } from '../state/sceneState';
import { buildPromptIR, type PromptIR, type PromptSemanticInput } from './promptIR';
import { buildSceneFacts } from './sceneFacts';
import { validatePromptCompilation } from './validation';

const baseSemantic: PromptSemanticInput = {
  identity: 'Preserve exact identity from the reference image.',
  body: 'tall lean-athletic male build',
  captureMechanics: 'Smartphone front-camera selfie at natural arm length.',
  hair: 'natural hair',
  expression: 'neutral expression',
  outfit: 'ordinary shirt and trousers',
  outfitPhysics: 'natural wrinkles',
  poseAndContact: 'standing naturally',
  visibleEnvironment: 'ordinary room',
  lighting: 'ordinary practical lighting',
  skinResponse: 'raw natural skin texture',
  cameraRealism: 'ordinary smartphone behavior',
  styleConstraints: '',
  handProp: '',
  facialHair: '3-day stubble',
  flashDetails: '',
  shadowBehavior: 'physically plausible shadows',
  backgroundDynamics: 'calm background',
  negativePrompt: 'plastic skin'
};

describe('validation gate', () => {
  it('allows a coherent front-selfie compilation', () => {
    const facts = buildSceneFacts({
      ...DEFAULT_STATE,
      captureType: 'front-selfie'
    });
    const ir = buildPromptIR(baseSemantic, facts);
    const report = validatePromptCompilation(ir, facts);

    expect(report.hasErrors).toBe(false);
  });

  it('blocks unresolved constraint conflicts', () => {
    const facts = buildSceneFacts(DEFAULT_STATE);
    const ir: PromptIR = {
      sections: buildPromptIR(baseSemantic, facts).sections,
      constraints: [],
      negatives: [],
      warnings: [],
      conflicts: [{
        unresolved: true,
        reason: 'equal-priority hard constraints disagree'
      }]
    };

    const report = validatePromptCompilation(ir, facts);
    expect(report.hasErrors).toBe(true);
    expect(report.issues).toContainEqual(expect.objectContaining({
      code: 'unresolved-constraint-conflict',
      severity: 'error'
    }));
  });

  it('blocks phone-screen-only lighting outside night', () => {
    const facts = {
      ...buildSceneFacts({
        ...DEFAULT_STATE,
        lightingMode: 'phone-screen',
        timeOfDay: 'night'
      }),
      timeOfDay: 'midday' as const
    };
    const ir = buildPromptIR(baseSemantic, facts);
    const report = validatePromptCompilation(ir, facts);

    expect(report.hasErrors).toBe(true);
    expect(report.issues).toContainEqual(expect.objectContaining({
      code: 'phone-screen-only-not-night',
      severity: 'error'
    }));
  });

  it('blocks typed front-selfie facts when capture mechanics are missing', () => {
    const facts = buildSceneFacts({
      ...DEFAULT_STATE,
      captureType: 'front-selfie'
    });
    const ir = buildPromptIR({
      ...baseSemantic,
      captureMechanics: 'Ambiguous handheld photograph.'
    }, facts);
    const report = validatePromptCompilation(ir, facts);

    expect(report.hasErrors).toBe(true);
    expect(report.issues).toContainEqual(expect.objectContaining({
      code: 'front-selfie-missing-capture-mechanics',
      severity: 'error'
    }));
  });

  it('blocks mirror selfie without reflection physics', () => {
    const facts = buildSceneFacts({
      ...DEFAULT_STATE,
      captureType: 'mirror-selfie'
    });
    const ir = buildPromptIR({
      ...baseSemantic,
      captureMechanics: 'Smartphone mirror selfie with ordinary framing.'
    }, facts);
    const report = validatePromptCompilation(ir, facts);

    expect(report.hasErrors).toBe(true);
    expect(report.issues).toContainEqual(expect.objectContaining({
      code: 'mirror-selfie-missing-reflection-physics',
      severity: 'error'
    }));
  });

  it('treats the impossible visible second phone as a warning because the compiler suppresses it', () => {
    const facts = buildSceneFacts({
      ...DEFAULT_STATE,
      captureType: 'front-selfie',
      handProp: 'phone'
    });
    const ir = buildPromptIR({
      ...baseSemantic,
      handProp: 'holding smartphone in one hand, screen visible'
    }, facts);
    const report = validatePromptCompilation(ir, facts);

    expect(report.hasErrors).toBe(false);
    expect(report.issues).toContainEqual(expect.objectContaining({
      code: 'front-selfie-visible-second-phone-suppressed',
      severity: 'warning'
    }));
  });

  it('treats digital zoom outside third-person capture as non-blocking info', () => {
    const facts = buildSceneFacts({
      ...DEFAULT_STATE,
      captureType: 'front-selfie',
      useDigitalZoom: true
    });
    const ir = buildPromptIR(baseSemantic, facts);
    const report = validatePromptCompilation(ir, facts);

    expect(report.hasErrors).toBe(false);
    expect(report.issues).toContainEqual(expect.objectContaining({
      code: 'digital-zoom-ignored-outside-third-person',
      severity: 'info'
    }));
  });

  it('requires explicit LHD driver geometry and constraint when the typed role is driver', () => {
    const facts = buildSceneFacts({
      ...DEFAULT_STATE,
      sceneFamily: 'car',
      activity: 'parked-behind-wheel'
    });
    const valid = buildPromptIR(baseSemantic, facts);
    const broken: PromptIR = {
      ...valid,
      constraints: valid.constraints.filter(item => item.id !== 'vehicle.driver_seat_lhd'),
      sections: valid.sections.map(section => section.id === 'scene'
        ? { ...section, text: 'ordinary car interior' }
        : section)
    };
    const report = validatePromptCompilation(broken, facts);

    expect(report.hasErrors).toBe(true);
    expect(report.issues.map(issue => issue.code)).toEqual(expect.arrayContaining([
      'driver-lhd-constraint-missing',
      'driver-scene-geometry-missing'
    ]));
  });
});
