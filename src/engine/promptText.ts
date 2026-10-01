import type { SceneState, SemanticScene } from '../types/scene';
import { lintGroupSelfieText } from './groupSelfie';
import { lintPhysicalText } from './physics';
import { auditPromptPhysics, type PromptAuditReport } from './physicsAuditor';
import { buildPromptIR, lintPromptIR, renderPromptIR } from './promptIR';
import { buildSceneFacts } from './sceneFacts';
import {
  PromptValidationError,
  validatePromptCompilation,
  type ValidationReport
} from './validation';

export interface PromptCompilationResult {
  prompt: string | null;
  validation: ValidationReport;
  audit: PromptAuditReport;
  warnings: string[];
}

export const compilePromptText = (
  semantic: SemanticScene,
  aiType: 'chatgpt' | 'gemini',
  state: SceneState
): PromptCompilationResult => {
  const facts = buildSceneFacts(state);
  const ir = buildPromptIR(semantic, facts);
  const validation = validatePromptCompilation(ir, facts);
  const audit = auditPromptPhysics(ir, facts);

  const resolverWarnings = [...ir.warnings];
  const validationWarnings = validation.issues
    .filter(issue => issue.severity !== 'error')
    .map(issue => `${issue.severity}:${issue.code}`);
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

  const allWarnings = Array.from(new Set([
    ...resolverWarnings,
    ...validationWarnings,
    ...warnings,
    ...physicsWarnings,
    ...groupWarnings
  ]));
  ir.warnings = allWarnings;

  if (allWarnings.length) {
    console.warn('[PhysFrame PromptLint]', allWarnings);
  }

  if (validation.hasErrors) {
    console.error('[PhysFrame ValidationGate]', validation.issues);
    return {
      prompt: null,
      validation,
      audit,
      warnings: allWarnings
    };
  }

  return {
    prompt: renderPromptIR(ir, aiType),
    validation,
    audit,
    warnings: allWarnings
  };
};

export const buildPromptText = (
  semantic: SemanticScene,
  aiType: 'chatgpt' | 'gemini',
  state: SceneState
): string => {
  const result = compilePromptText(semantic, aiType, state);
  if (result.prompt === null) {
    throw new PromptValidationError(result.validation);
  }
  return result.prompt;
};
