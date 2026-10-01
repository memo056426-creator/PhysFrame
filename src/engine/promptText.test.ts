import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SceneState, SemanticScene } from '../types/scene';
import { buildPromptText, compilePromptText } from './promptText';
import { PromptValidationError } from './validation';

const makeState = (overrides: Partial<SceneState> = {}): SceneState => ({
  referenceImageId: null,
  hasGlasses: false,
  sceneFamily: 'bedroom',
  subScene: 'beside-bed',
  activity: 'standing-natural',
  captureType: 'front-selfie',
  framing: 'chest-up',
  cameraAngle: 'eye-level',
  framingImperfection: 'perfect',
  useDigitalZoom: false,
  pose: 'standing-steady',
  selfiePoseModifier: 'front-natural',
  freeHandPose: 'relaxed',
  outfitId: 'cas1',
  hairStyle: 'h1',
  expression: 'e1',
  timeOfDay: 'night',
  lightingMode: 'phone-screen',
  environmentRealism: 'طبيعية',
  realismStyle: 'anti-ai-raw',
  lensCondition: 'modern-iphone',
  clothingCondition: 'crisp',
  atmosphericCondition: 'neutral',
  foregroundObstruction: 'clean',
  gazeDirection: 'at-camera',
  handProp: 'none',
  facialHairState: '3-day-stubble',
  flashMode: 'no-flash',
  backgroundDynamics: 'empty',
  groupSelfieEnabled: false,
  groupSelfieCompanionCount: 1,
  ...overrides
});

const makeSemantic = (overrides: Partial<SemanticScene> = {}): SemanticScene => ({
  identity: 'Preserve exact facial identity from the reference image.',
  body: '193cm, 83kg, tall lean-athletic male build.',
  captureMechanics: 'Smartphone front-camera selfie at arm length.',
  hair: 'Natural short hair with visible strands.',
  expression: 'Neutral candid expression.',
  outfit: 'beige linen shirt and off-white trousers',
  outfitPhysics: 'natural linen wrinkles and gravity folds',
  poseAndContact: 'standing naturally with believable weight distribution',
  visibleEnvironment: 'Location: ordinary realistic bedroom setting.',
  lighting: 'Time: night. Lighting source: phone screen only.',
  skinResponse: 'visible pores and natural skin texture',
  cameraRealism: 'smartphone front-camera aesthetic with ordinary sensor limitations',
  styleConstraints: 'MUST LOOK LIKE AN UNEDITED SMARTPHONE SNAPSHOT. NO CGI OR 3D RENDER AESTHETICS',
  handProp: '',
  facialHair: '3-day stubble',
  flashDetails: '',
  shadowBehavior: 'physically plausible contact shadows',
  backgroundDynamics: 'Calm background with no prominent background people.',
  negativePrompt: 'plastic skin, beauty filter, crowd',
  ...overrides
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildPromptText', () => {
  it('renders the ChatGPT target with the existing raw-smartphone contract', () => {
    const text = buildPromptText(makeSemantic(), 'chatgpt', makeState());
    expect(text).toContain('CRITICAL INSTRUCTION: Generate a raw, unedited, authentic smartphone snapshot.');
    expect(text).toContain('SUBJECT & IDENTITY:');
    expect(text).toContain('NEGATIVE PROMPT: plastic skin, beauty filter, crowd.');
  });

  it('renders the Gemini target without changing semantic content', () => {
    const text = buildPromptText(makeSemantic(), 'gemini', makeState());
    expect(text).toContain('Create a highly realistic, raw smartphone photograph');
    expect(text).toContain('beige linen shirt and off-white trousers');
    expect(text).toContain('STRICT REALISM CONSTRAINTS:');
  });

  it('keeps the front-selfie second-phone contradiction sanitized by PromptIR', () => {
    const text = buildPromptText(
      makeSemantic({ handProp: 'holding smartphone in one hand, screen visible' }),
      'chatgpt',
      makeState()
    );
    expect(text).not.toContain('holding smartphone in one hand, screen visible');
  });

  it('keeps PromptIR lint warnings connected to the final builder', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    buildPromptText(
      makeSemantic(),
      'chatgpt',
      makeState({ timeOfDay: 'midday', lightingMode: 'phone-screen' })
    );
    expect(warn).toHaveBeenCalled();
    expect(warn.mock.calls.flat().join(' ')).toContain('phone-screen-only-not-night');
  });

  it('returns a blocked compilation result instead of rendering when validation has errors', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = compilePromptText(
      makeSemantic({ captureMechanics: 'Ambiguous handheld photograph.' }),
      'chatgpt',
      makeState({ captureType: 'front-selfie' })
    );

    expect(result.prompt).toBeNull();
    expect(result.validation.hasErrors).toBe(true);
    expect(result.validation.issues).toContainEqual(expect.objectContaining({
      code: 'front-selfie-missing-capture-mechanics',
      severity: 'error'
    }));
  });

  it('preserves the strict builder API for callers that want validation errors to throw', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => buildPromptText(
      makeSemantic({ captureMechanics: 'Ambiguous handheld photograph.' }),
      'chatgpt',
      makeState({ captureType: 'front-selfie' })
    )).toThrow(PromptValidationError);
  });

  it('does not block rendering for warnings or info-only validation findings', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const result = compilePromptText(
      makeSemantic(),
      'chatgpt',
      makeState({ timeOfDay: 'midday', lightingMode: 'phone-screen', useDigitalZoom: true })
    );

    expect(result.prompt).not.toBeNull();
    expect(result.validation.hasErrors).toBe(false);
    expect(result.validation.issues.map(issue => issue.severity)).toEqual(expect.arrayContaining(['warning', 'info']));
  });

  it('returns advisory physics findings without blocking or rewriting an otherwise valid prompt', () => {
    const result = compilePromptText(
      makeSemantic({
        captureMechanics: 'Smartphone front-camera selfie. Distance: 50 cm. The selfie arm remains anatomically plausible.'
      }),
      'chatgpt',
      makeState()
    );

    expect(result.prompt).not.toBeNull();
    expect(result.validation.hasErrors).toBe(false);
    expect(result.audit).toEqual(expect.objectContaining({
      findings: expect.any(Array),
      hasCritical: expect.any(Boolean)
    }));
    expect(result.prompt).toContain('Distance: 50 cm');
  });
});
