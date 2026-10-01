import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE } from '../state/sceneState';
import { buildPromptIR, renderPromptIR, type PromptSemanticInput } from './promptIR';
import { buildSceneFacts } from './sceneFacts';

const semantic: PromptSemanticInput = {
  identity: 'Preserve exact identity from the reference image.',
  body: 'tall lean-athletic male build',
  captureMechanics: 'Ambiguous capture wording.',
  hair: 'natural hair',
  expression: 'neutral expression',
  outfit: 'ordinary shirt and trousers',
  outfitPhysics: 'natural wrinkles',
  poseAndContact: 'seated naturally',
  visibleEnvironment: 'ordinary interior',
  lighting: 'selected practical lighting behavior',
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

describe('typed scene facts integration', () => {
  it('removes semantic capture and lighting constraints that contradict authoritative typed facts', () => {
    const facts = buildSceneFacts({
      ...DEFAULT_STATE,
      captureType: 'front-selfie',
      lightingMode: 'phone-screen',
      timeOfDay: 'night'
    });
    const ir = buildPromptIR({
      ...semantic,
      styleConstraints: [
        'Ceiling illumination is active',
        'External photographer taking the shot',
        'Mirror reflection physics'
      ].join('. ')
    }, facts);

    const ids = ir.constraints.map(item => item.id);
    expect(ids).not.toContain('lighting.ceiling_on');
    expect(ids).not.toContain('capture.external_photographer');
    expect(ids).not.toContain('mirror.reflection_physics');
    expect(ir.conflicts).toContainEqual(expect.objectContaining({
      winner: 'lighting.phone_screen_only',
      loser: 'lighting.ceiling_on',
      unresolved: false
    }));
  });

  it('uses typed vehicle role even when semantic text does not mention driver geometry', () => {
    const facts = buildSceneFacts({
      ...DEFAULT_STATE,
      sceneFamily: 'car',
      activity: 'parked-behind-wheel'
    });
    const ir = buildPromptIR(semantic, facts);
    const scene = ir.sections.find(item => item.id === 'scene')?.text ?? '';

    expect(scene).toContain("FRONT-LEFT DRIVER'S SEAT");
    expect(scene).toContain('LEFT-HAND-DRIVE');
    expect(ir.constraints.some(item => item.id === 'vehicle.driver_seat_lhd')).toBe(true);
  });

  it('suppresses a visible second phone from typed front-selfie facts without parsing capture wording', () => {
    const facts = buildSceneFacts({
      ...DEFAULT_STATE,
      captureType: 'front-selfie',
      handProp: 'phone'
    });
    const ir = buildPromptIR({
      ...semantic,
      captureMechanics: 'Unstructured capture description with no selfie keywords.',
      handProp: 'holding smartphone in one hand, screen visible'
    }, facts);
    const output = renderPromptIR(ir, 'chatgpt');

    expect(output).not.toContain('holding smartphone in one hand, screen visible');
  });

  it('removes stale phone-screen-only constraints when another lighting mode is selected', () => {
    const facts = buildSceneFacts({
      ...DEFAULT_STATE,
      lightingMode: 'office-fluorescent'
    });
    const ir = buildPromptIR({
      ...semantic,
      styleConstraints: 'The smartphone screen is the only practical light source'
    }, facts);

    expect(ir.constraints.some(item => item.id === 'lighting.phone_screen_only')).toBe(false);
    expect(ir.conflicts).toContainEqual(expect.objectContaining({
      loser: 'lighting.phone_screen_only',
      unresolved: false
    }));
  });
});
