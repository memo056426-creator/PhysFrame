import type { PromptIR } from './promptIR';
import type { SceneFacts } from './sceneFacts';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  message: string;
}

export interface ValidationReport {
  issues: ValidationIssue[];
  hasErrors: boolean;
}

const getSectionText = (ir: PromptIR, sectionId: PromptIR['sections'][number]['id']): string =>
  ir.sections.find(section => section.id === sectionId)?.text ?? '';

const hasConstraint = (ir: PromptIR, id: string): boolean =>
  ir.constraints.some(constraint => constraint.id === id);

export const validatePromptCompilation = (ir: PromptIR, facts: SceneFacts): ValidationReport => {
  const issues: ValidationIssue[] = [];
  const cameraText = getSectionText(ir, 'camera').toLowerCase();
  const sceneText = getSectionText(ir, 'scene').toLowerCase();

  for (const conflict of ir.conflicts ?? []) {
    if (conflict.unresolved) {
      issues.push({
        code: 'unresolved-constraint-conflict',
        severity: 'error',
        message: conflict.reason
      });
    }
  }

  if (facts.lightingMode === 'phone-screen' && facts.lightingSoleAmbientSource && facts.timeOfDay !== 'night') {
    issues.push({
      code: 'phone-screen-only-not-night',
      severity: 'error',
      message: 'Phone-screen-only lighting requires a night/dark scene state.'
    });
  }

  if (facts.captureType === 'front-selfie') {
    if (!/(front-camera selfie|front camera selfie|group crew selfie)/i.test(cameraText)) {
      issues.push({
        code: 'front-selfie-missing-capture-mechanics',
        severity: 'error',
        message: 'Typed capture mode is front-selfie but the rendered camera section does not contain front-selfie capture mechanics.'
      });
    }

    if (facts.visiblePhoneRequested && !facts.visiblePhoneAllowed) {
      issues.push({
        code: 'front-selfie-visible-second-phone-suppressed',
        severity: 'warning',
        message: 'A visible phone was requested, but front-selfie geometry does not allow a second visible capture phone. The visible-phone detail is suppressed.'
      });
    }
  }

  if (facts.captureType === 'mirror-selfie') {
    if (!/mirror selfie/i.test(cameraText)) {
      issues.push({
        code: 'mirror-selfie-missing-capture-mechanics',
        severity: 'error',
        message: 'Typed capture mode is mirror-selfie but the rendered camera section does not contain mirror-selfie capture mechanics.'
      });
    }

    if (facts.mirrorReflectionRequired && !/reflection/i.test(cameraText)) {
      issues.push({
        code: 'mirror-selfie-missing-reflection-physics',
        severity: 'error',
        message: 'Mirror-selfie mode requires explicit reflection physics in the camera section.'
      });
    }
  }

  if (facts.captureType === 'third-person-candid' && !/third-person candid photograph/i.test(cameraText)) {
    issues.push({
      code: 'third-person-missing-capture-mechanics',
      severity: 'error',
      message: 'Typed capture mode is third-person-candid but the rendered camera section does not contain third-person capture mechanics.'
    });
  }

  if (facts.useDigitalZoom && facts.captureType !== 'third-person-candid') {
    issues.push({
      code: 'digital-zoom-ignored-outside-third-person',
      severity: 'info',
      message: 'Digital zoom is enabled in state but is intentionally not applied outside third-person candid capture.'
    });
  }

  if (facts.vehicleRole === 'driver') {
    if (facts.vehicleDriveSide !== 'lhd') {
      issues.push({
        code: 'driver-drive-side-invalid',
        severity: 'error',
        message: 'Driver role currently requires the project LHD vehicle lock.'
      });
    }

    if (!hasConstraint(ir, 'vehicle.driver_seat_lhd')) {
      issues.push({
        code: 'driver-lhd-constraint-missing',
        severity: 'error',
        message: 'Typed driver role is active but the LHD driver-seat hard constraint is missing.'
      });
    }

    if (!/front-left driver's seat|front-left driver s seat/i.test(sceneText) || !/left-hand-drive/i.test(sceneText)) {
      issues.push({
        code: 'driver-scene-geometry-missing',
        severity: 'error',
        message: 'Typed driver role is active but the scene section is missing explicit front-left LHD driver geometry.'
      });
    }
  }

  return {
    issues,
    hasErrors: issues.some(issue => issue.severity === 'error')
  };
};

export class PromptValidationError extends Error {
  readonly report: ValidationReport;

  constructor(report: ValidationReport) {
    super(`Prompt validation failed: ${report.issues.filter(issue => issue.severity === 'error').map(issue => issue.code).join(', ')}`);
    this.name = 'PromptValidationError';
    this.report = report;
  }
}
