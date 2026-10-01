import { describe, expect, it } from 'vitest';
import {
  buildPromptIR,
  lintPromptIR,
  renderPromptIR,
  resolveConstraintSet,
  resolveConstraintSetDetailed,
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
  lightingMode: 'phone-screen',
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

  it('deduplicates wording variants that share one canonical constraint id', () => {
    const constraints: PromptConstraint[] = [
      { id: 'skin.no_smoothing', text: 'Do not smooth skin', priority: 'soft', domain: 'skin' },
      { id: 'skin.no_smoothing', text: 'ZERO digital skin smoothing', priority: 'hard', domain: 'skin' },
      { id: 'skin.no_smoothing', text: 'No beauty skin cleanup', priority: 'derived', domain: 'skin' }
    ];

    const result = resolveConstraintSet(constraints);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'skin.no_smoothing', priority: 'hard' });
    expect(result[0].text).toBe('ZERO digital skin smoothing');
  });

  it('lets hard phone-screen-only lighting remove soft ceiling lighting', () => {
    const result = resolveConstraintSetDetailed([
      { id: 'lighting.phone_screen_only', text: 'Phone screen only', priority: 'hard', domain: 'lighting' },
      { id: 'lighting.ceiling_on', text: 'Ceiling light active', priority: 'soft', domain: 'lighting' }
    ]);

    expect(result.constraints.map(item => item.id)).toEqual(['lighting.phone_screen_only']);
    expect(result.conflicts).toContainEqual(expect.objectContaining({
      winner: 'lighting.phone_screen_only',
      loser: 'lighting.ceiling_on',
      unresolved: false
    }));
  });

  it('lets hard phone-screen-only lighting remove derived daylight', () => {
    const result = resolveConstraintSetDetailed([
      { id: 'lighting.phone_screen_only', text: 'Phone screen only', priority: 'hard', domain: 'lighting' },
      { id: 'lighting.daylight', text: 'Daylight contribution', priority: 'derived', domain: 'lighting' }
    ]);

    expect(result.constraints.map(item => item.id)).toEqual(['lighting.phone_screen_only']);
  });

  it('prefers front-selfie capture over an equal-priority external photographer instruction', () => {
    const result = resolveConstraintSetDetailed([
      { id: 'capture.front_selfie', text: 'Front-camera selfie', priority: 'hard', domain: 'capture' },
      { id: 'capture.external_photographer', text: 'External photographer', priority: 'hard', domain: 'capture' }
    ]);

    expect(result.constraints.map(item => item.id)).toEqual(['capture.front_selfie']);
    expect(result.conflicts[0]).toMatchObject({
      winner: 'capture.front_selfie',
      loser: 'capture.external_photographer',
      unresolved: false
    });
  });

  it('keeps equal-priority mutually exclusive capture modes and reports an unresolved conflict when no winner is defined', () => {
    const result = resolveConstraintSetDetailed([
      { id: 'capture.front_selfie', text: 'Front-camera selfie', priority: 'hard', domain: 'capture' },
      { id: 'capture.mirror_selfie', text: 'Mirror selfie', priority: 'hard', domain: 'capture' }
    ]);

    expect(result.constraints.map(item => item.id)).toEqual(['capture.front_selfie', 'capture.mirror_selfie']);
    expect(result.conflicts).toContainEqual(expect.objectContaining({ unresolved: true }));
  });

  it('leaves unrelated compatible constraints unchanged', () => {
    const constraints: PromptConstraint[] = [
      { id: 'identity.preserve_exact', text: 'Preserve exact identity', priority: 'hard', domain: 'identity' },
      { id: 'physics.weight', text: 'Natural weight distribution', priority: 'hard', domain: 'physics' },
      { id: 'camera.capture_imperfection', text: 'Ordinary handheld imperfection', priority: 'derived', domain: 'camera' }
    ];

    expect(resolveConstraintSet(constraints)).toEqual(constraints);
  });

  it('canonicalizes duplicate semantic skin-smoothing instructions before rendering', () => {
    const ir = buildPromptIR({
      ...semantic,
      styleConstraints: 'ZERO digital skin smoothing. Do not smooth skin. No beauty skin cleanup'
    });

    expect(ir.constraints.filter(item => item.id === 'skin.no_smoothing')).toHaveLength(1);
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
