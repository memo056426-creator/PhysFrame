import { describe, expect, it } from 'vitest';
import { normalizeSceneState } from '../state/sceneState';
import { buildPromptText } from './promptText';
import { deriveRealismState } from './realismState';
import { buildSemanticScene } from './semanticScene';
import { PromptValidationError } from './validation';

const buildValidBedroomState = () => normalizeSceneState({
  sceneFamily: 'bedroom',
  captureType: 'front-selfie',
  timeOfDay: 'night',
  lightingMode: 'phone-screen',
  handProp: 'none'
});

describe('validation gate integration', () => {
  it('allows the normal normalized scene pipeline to render', () => {
    const state = buildValidBedroomState();
    const semantic = buildSemanticScene(state, deriveRealismState(state));

    expect(() => buildPromptText(semantic, 'chatgpt', state)).not.toThrow();
    expect(buildPromptText(semantic, 'chatgpt', state)).toContain('Smartphone front-camera selfie');
  });

  it('blocks rendering when authoritative capture facts and semantic mechanics disagree', () => {
    const state = buildValidBedroomState();
    const semantic = {
      ...buildSemanticScene(state, deriveRealismState(state)),
      captureMechanics: 'Ambiguous handheld photograph with no declared capture ownership.'
    };

    expect(() => buildPromptText(semantic, 'chatgpt', state)).toThrow(PromptValidationError);
  });
});
