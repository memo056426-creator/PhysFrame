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

const driverSemantic: PromptSemanticInput = {
  ...semantic,
  poseAndContact: 'Pose: جالس باسترخاء في المقعد. Activity: خلف المقود والسيارة متوقفة. Contact rules: natural weight distribution.',
  visibleEnvironment: 'Location: ordinary realistic السيارة setting. Visible elements: near-field: premium dark leather seat texture, near-field: seatbelt edge.',
  lighting: 'street illumination through vehicle glass',
  handProp: 'holding smartphone in one hand, screen visible'
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

  it('keeps driver geometry as hard constraints even when tight framing omits dashboard details', () => {
    const ir = buildPromptIR(driverSemantic);
    const scene = ir.sections.find(section => section.id === 'scene')?.text ?? '';
    expect(scene).toContain("FRONT-LEFT DRIVER'S SEAT");
    expect(scene).toContain('LEFT-HAND-DRIVE');
    expect(ir.constraints.some(item => item.priority === 'hard' && item.text.includes("front-left driver's seat"))).toBe(true);
    expect(ir.constraints.some(item => item.priority === 'hard' && item.text.includes('steering wheel MUST remain centered directly in front'))).toBe(true);
    expect(ir.negatives).toContain('passenger-seat placement');
    expect(ir.negatives).toContain('right-hand-drive cabin');
  });

  it('removes the impossible second visible phone from a front-camera selfie', () => {
    const ir = buildPromptIR(driverSemantic);
    const output = renderPromptIR(ir, 'chatgpt');
    expect(output).not.toContain('holding smartphone in one hand, screen visible');
    expect(output).not.toContain('front-selfie-visible-second-phone');
  });

  it('still allows a visible phone in a mirror selfie', () => {
    const ir = buildPromptIR({
      ...semantic,
      captureMechanics: 'Smartphone mirror selfie with geometrically accurate reflection.',
      handProp: 'holding smartphone in one hand, screen visible'
    });
    const output = renderPromptIR(ir, 'chatgpt');
    expect(output).toContain('holding smartphone in one hand, screen visible');
  });

  it('renders the LHD driver lock for both ChatGPT and Gemini', () => {
    const ir = buildPromptIR(driverSemantic);
    const chatgpt = renderPromptIR(ir, 'chatgpt');
    const gemini = renderPromptIR(ir, 'gemini');

    for (const output of [chatgpt, gemini]) {
      expect(output).toContain("FRONT-LEFT DRIVER'S SEAT");
      expect(output).toContain('Preserve the real unmirrored LHD cabin orientation');
      expect(output).toContain('center console on wrong side');
    }
  });
});
