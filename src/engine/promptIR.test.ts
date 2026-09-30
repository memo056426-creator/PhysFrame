import { describe, expect, it } from 'vitest';
import {
  buildPromptIR,
  lintPromptIR,
  renderPromptIR,
  resolveConstraintSet,
  type PromptConstraint,
  type PromptFacts,
  type PromptSemanticInput
} from './promptIR';

const semantic: PromptSemanticInput = {
  identity: 'Preserve exact identity from the reference image.',
  body: 'tall lean-athletic male build',
  captureMechanics: 'Smartphone front-camera selfie at natural arm length, 24mm equivalent.',
  hair: 'natural hair with locked biological density',
  expression: 'neutral tired real-world expression',
  outfit: 'white shirt and tailored trousers',
  outfitPhysics: 'natural wrinkles and waist compression',
  poseAndContact: 'standing naturally with real contact physics',
  visibleEnvironment: 'ordinary room',
  lighting: 'phone screen is the only practical light source',
  skinResponse: 'raw pores, natural T-zone oiliness, no smoothing',
  cameraRealism: 'front-camera wide-angle smartphone behavior',
  styleConstraints: 'NO impossible lighting. PRESERVE exact identity. ordinary handheld imperfection',
  handProp: '',
  facialHair: '3-day stubble',
  flashDetails: '',
  shadowBehavior: 'rapid local falloff',
  backgroundDynamics: 'Calm background with no prominent background people.',
  negativePrompt: 'plastic skin, waxy skin, beauty filter, background people staring at camera'
};

const facts: PromptFacts = {
  hasGlasses: false,
  backgroundDynamics: 'empty',
  captureType: 'front-selfie',
  useDigitalZoom: false,
  lightingMode: 'إضاءة شاشة الهاتف فقط',
  timeOfDay: 'night'
};

describe('Prompt IR', () => {
  it('keeps the highest-priority duplicate constraint', () => {
    const constraints: PromptConstraint[] = [
      { id: 'soft', text: 'Preserve exact identity', priority: 'soft', domain: 'identity' },
      { id: 'hard', text: 'Preserve exact identity', priority: 'hard', domain: 'identity' }
    ];

    const result = resolveConstraintSet(constraints);
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe('hard');
  });

  it('builds a structured IR with hard constraints ahead of soft constraints', () => {
    const ir = buildPromptIR(semantic);
    expect(ir.sections.find(section => section.id === 'identity')?.priority).toBe('hard');
    expect(ir.constraints[0].priority).toBe('hard');
    expect(ir.negatives).toContain('plastic skin');
  });

  it('renders Gemini without injecting generic focal-length numbers', () => {
    const ir = buildPromptIR(semantic);
    const output = renderPromptIR(ir, 'gemini');
    expect(output).toContain('24mm equivalent');
    expect(output).not.toContain('26mm-35mm');
    expect(output).not.toContain('f/1.8 aperture');
  });

  it('detects eyeglass leakage when glasses are disabled', () => {
    const ir = buildPromptIR({ ...semantic, cameraRealism: 'reflection on eyeglasses lens' });
    expect(lintPromptIR(ir, facts)).toContain('eyewear-present-while-hasGlasses-false');
  });

  it('detects secondary ambient sources in phone-screen-only mode', () => {
    const ir = buildPromptIR({ ...semantic, lighting: 'phone screen only plus dashboard ambient lighting' });
    expect(lintPromptIR(ir, facts)).toContain('phone-screen-only-has-secondary-ambient-source');
  });

  it('detects digital zoom leakage outside third-person candid mode', () => {
    const ir = buildPromptIR({ ...semantic, cameraRealism: 'smartphone digital zoom artifacts with in-sensor crop' });
    const warnings = lintPromptIR(ir, facts);
    expect(warnings).toContain('digital-zoom-artifacts-outside-third-person-candid');
    expect(warnings).toContain('digital-zoom-artifacts-while-disabled');
  });
});
