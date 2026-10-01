import type { SceneState, SemanticScene } from '../types/scene';
import { lintGroupSelfieText } from './groupSelfie';
import { lintPhysicalText } from './physics';
import { buildPromptIR, lintPromptIR, renderPromptIR, type PromptFacts } from './promptIR';

export const buildPromptText = (
  semantic: SemanticScene,
  aiType: 'chatgpt' | 'gemini',
  state: SceneState
): string => {
  const facts: PromptFacts = {
    hasGlasses: state.hasGlasses,
    backgroundDynamics: state.backgroundDynamics,
    captureType: state.captureType,
    useDigitalZoom: state.useDigitalZoom,
    lightingMode: state.lightingMode,
    timeOfDay: state.timeOfDay
  };

  const ir = buildPromptIR(semantic);
  const warnings = lintPromptIR(ir, facts);
  const physicsWarnings = lintPhysicalText(
    [
      semantic.hair,
      semantic.outfitPhysics,
      semantic.poseAndContact,
      semantic.skinResponse,
      semantic.cameraRealism,
      semantic.styleConstraints
    ].join('\n'),
    { hasGlasses: state.hasGlasses, captureType: state.captureType }
  );
  const groupWarnings = lintGroupSelfieText(
    [
      semantic.identity,
      semantic.captureMechanics,
      semantic.poseAndContact,
      semantic.cameraRealism,
      semantic.styleConstraints
    ].join('\n'),
    {
      enabled: state.groupSelfieEnabled,
      companionCount: state.groupSelfieCompanionCount,
      captureType: state.captureType
    }
  );

  ir.warnings.push(...warnings, ...physicsWarnings, ...groupWarnings);
  if (warnings.length || physicsWarnings.length || groupWarnings.length) {
    console.warn('[PhysFrame PromptLint]', [...warnings, ...physicsWarnings, ...groupWarnings]);
  }

  return renderPromptIR(ir, aiType);
};
