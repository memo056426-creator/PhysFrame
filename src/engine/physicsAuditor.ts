import type { PromptIR } from './promptIR';
import type { SceneFacts } from './sceneFacts';

export type AuditSeverity = 'p0' | 'p1' | 'p2';
export type AuditDomain =
  | 'spatial'
  | 'camera'
  | 'physics'
  | 'furniture'
  | 'material'
  | 'lighting'
  | 'reflection'
  | 'architecture'
  | 'semantic';

export type AuditPatchOperation = 'replace' | 'delete' | 'add-after';

export interface AuditPatch {
  operation: AuditPatchOperation;
  target: string;
  replacement?: string;
}

export interface AuditFinding {
  code: string;
  severity: AuditSeverity;
  domain: AuditDomain;
  problem: string;
  rootCause: string;
  mechanism: string;
  visualConsequence: string;
  fix: string;
  patch?: AuditPatch;
}

export interface PromptAuditReport {
  findings: AuditFinding[];
  hasCritical: boolean;
  highestSeverity: AuditSeverity | null;
}

const SEVERITY_WEIGHT: Record<AuditSeverity, number> = {
  p0: 300,
  p1: 200,
  p2: 100
};

const sectionText = (ir: PromptIR, id: PromptIR['sections'][number]['id']): string =>
  ir.sections.find(section => section.id === id)?.text ?? '';

const positiveText = (ir: PromptIR): string => [
  ...ir.sections.map(section => section.text),
  ...ir.constraints.map(constraint => constraint.text)
].join(' ');

const containsAny = (text: string, expressions: readonly RegExp[]): boolean =>
  expressions.some(expression => expression.test(text));

const hasPositiveStyleLeak = (text: string): string | null => {
  const checks: Array<[string, RegExp, RegExp]> = [
    ['cinematic', /\bcinematic\b/i, /\b(?:no|not|avoid|without|non)[- ]?cinematic\b/i],
    ['studio', /\bstudio(?:[- ]lit| lighting| treatment| portrait)?\b/i, /\b(?:no|not|avoid|without)\b.{0,24}\bstudio\b/i],
    ['editorial', /\beditorial\b/i, /\b(?:no|not|avoid|without)\b.{0,24}\beditorial\b/i],
    ['glamorous', /\bglamorous\b/i, /\b(?:no|not|avoid|without|un)[- ]?glamorous\b/i],
    ['luxurious', /\bluxurious\b/i, /\b(?:no|not|avoid|without)\b.{0,24}\bluxurious\b/i]
  ];

  for (const [label, positive, negated] of checks) {
    if (positive.test(text) && !negated.test(text)) return label;
  }

  return null;
};

const furnitureTerms = [
  /\bsofa\b/i,
  /\bcouch\b/i,
  /\barmchair\b/i,
  /\bchair\b/i,
  /\bcoffee table\b/i,
  /\bside table\b/i,
  /\bnightstand\b/i,
  /\bbed\b/i,
  /\bwardrobe\b/i,
  /\bdresser\b/i,
  /\bdesk\b/i
] as const;

const countFurnitureKinds = (text: string): number =>
  furnitureTerms.reduce((count, term) => count + (term.test(text) ? 1 : 0), 0);

const hasSpatialAnchors = (text: string): boolean => containsAny(text, [
  /\b(?:front|back|left|right) wall\b/i,
  /\bagainst the\b/i,
  /\bcentered (?:on|against|in)\b/i,
  /\bparallel to\b/i,
  /\badjacent to\b/i,
  /\bnext to\b/i,
  /\bto the (?:left|right) of\b/i,
  /\bbehind\b/i,
  /\bin front of\b/i
]);

const looksSeated = (text: string): boolean => containsAny(text, [
  /\bseated\b/i,
  /\bsitting\b/i,
  /جالس/i
]);

const looksLying = (text: string): boolean => containsAny(text, [
  /\blying\b/i,
  /\breclined\b/i,
  /استلق/i
]);

const hasSeatedSupportPhysics = (text: string): boolean => containsAny(text, [
  /\bweight distribution\b/i,
  /\bseat cushion\b/i,
  /\bsitting surface\b/i,
  /\bpelvis\b/i,
  /\bbackrest\b/i,
  /\bcompression\b/i,
  /\bfeet (?:grounded|on the floor)\b/i
]);

const hasLyingSupportPhysics = (text: string): boolean => containsAny(text, [
  /\bmattress\b/i,
  /\bpillow\b/i,
  /\bbed surface\b/i,
  /\bbody compression\b/i,
  /\bcompression\b/i,
  /\bsupport contact\b/i
]);

const findHighestSeverity = (findings: readonly AuditFinding[]): AuditSeverity | null => {
  let result: AuditSeverity | null = null;
  for (const finding of findings) {
    if (!result || SEVERITY_WEIGHT[finding.severity] > SEVERITY_WEIGHT[result]) {
      result = finding.severity;
    }
  }
  return result;
};

/**
 * Deterministic advisory audit over resolved PromptIR + typed SceneFacts.
 *
 * V1 intentionally does not rewrite prompts, does not block rendering, and does
 * not invent dimensions that are absent from the typed scene model. Findings
 * are limited to high-confidence geometry/physics risks and under-constrained
 * spatial relationships that can be demonstrated from the current IR.
 */
export const auditPromptPhysics = (ir: PromptIR, facts: SceneFacts): PromptAuditReport => {
  const findings: AuditFinding[] = [];
  const camera = sectionText(ir, 'camera');
  const scene = sectionText(ir, 'scene');
  const attire = sectionText(ir, 'attire');
  const texture = sectionText(ir, 'texture');
  const allPositive = positiveText(ir);

  if (facts.captureType === 'front-selfie') {
    const hasDistance = /\bdistance\s*:/i.test(camera) || /\b(?:40|45|50|55|60)\s*(?:cm|centimeters?)\b/i.test(camera);
    const hasArmGeometry = /\barm\b|\bshooter anatomy\b/i.test(camera);

    if (!hasDistance || !hasArmGeometry) {
      findings.push({
        code: 'camera.front-selfie-underconstrained-geometry',
        severity: 'p0',
        domain: 'camera',
        problem: 'Front-selfie capture is missing an explicit reachable camera-distance or arm-geometry relationship.',
        rootCause: 'The capture section declares a front selfie but does not fully anchor the phone to the subject-operated selfie geometry.',
        mechanism: 'Without a reachable phone position, the image model may satisfy the framing using an implicit third-person camera or an anatomically implausible arm.',
        visualConsequence: 'Floating-camera perspective, impossible arm reach, or a third-person composition disguised as a selfie.',
        fix: 'Keep the existing capture mode and add one concise distance-plus-arm relationship; do not add a second camera description.',
        patch: {
          operation: 'add-after',
          target: 'Smartphone front-camera selfie.',
          replacement: 'The capture phone remains at physically reachable arm length with anatomically plausible shoulder, elbow, wrist, and hand alignment.'
        }
      });
    }

    if (/third-person candid|external photographer|photographer taking/i.test(camera)) {
      findings.push({
        code: 'camera.front-selfie-third-person-leak',
        severity: 'p0',
        domain: 'camera',
        problem: 'Front-selfie camera geometry contains third-person capture semantics.',
        rootCause: 'Mutually exclusive capture semantics survived into the positive camera section.',
        mechanism: 'The image model can resolve the conflict by moving the camera away from the subject while preserving only the requested framing.',
        visualConsequence: 'The result may look photographed by another person even though the prompt requests a selfie.',
        fix: 'Delete the third-person capture phrase instead of adding more selfie wording.',
        patch: {
          operation: 'delete',
          target: 'third-person/external-photographer capture wording'
        }
      });
    }
  }

  if (facts.captureType === 'mirror-selfie') {
    if (!/\breflection\b/i.test(camera)) {
      findings.push({
        code: 'reflection.mirror-selfie-physics-missing',
        severity: 'p0',
        domain: 'reflection',
        problem: 'Mirror-selfie capture lacks explicit reflection geometry.',
        rootCause: 'The capture mode depends on a reflective surface but the camera section does not state the reflection relationship.',
        mechanism: 'The model may render a direct-camera selfie, duplicate the subject, or place the phone/camera at an impossible reflected position.',
        visualConsequence: 'Broken mirror perspective, duplicate people, missing phone reflection, or inconsistent room geometry.',
        fix: 'Add one reflection-geometry clause tied to the existing mirror selfie; do not add a second scene layout.',
        patch: {
          operation: 'add-after',
          target: 'Smartphone mirror selfie.',
          replacement: 'Mirror reflection obeys the same room layout and camera-subject geometry with no duplicated person or furniture.'
        }
      });
    }
  } else if (/\bmirror selfie\b|\bmirror-selfie\b/i.test(camera)) {
    findings.push({
      code: 'reflection.mirror-mode-leak',
      severity: 'p0',
      domain: 'reflection',
      problem: 'Mirror-selfie semantics appear in a non-mirror capture mode.',
      rootCause: 'Reflection-specific capture instructions leaked into an incompatible camera mode.',
      mechanism: 'The model may introduce an unnecessary mirror, reflected phone, or duplicate camera viewpoint.',
      visualConsequence: 'Invented mirror, duplicate subject, or contradictory camera location.',
      fix: 'Remove the mirror-selfie phrase from the positive camera section.',
      patch: {
        operation: 'delete',
        target: 'mirror-selfie capture wording'
      }
    });
  }

  if (facts.lightingMode === 'phone-screen' && facts.lightingSoleAmbientSource) {
    const secondaryLight = containsAny(camera, [
      /\b(?:active|on) ceiling (?:light|lighting)\b/i,
      /\bbedside (?:lamp|light) (?:provides|casts|illuminates|is on)\b/i,
      /\bfluorescent (?:office )?(?:light|lighting|illumination)\b/i,
      /\bstreetlights? (?:illuminate|light|cast|provide)\b/i,
      /\bdaylight (?:illuminates|fills|lights|provides)\b/i,
      /\b(?:fill|rim|key) light\b/i,
      /\bsoftbox\b/i
    ]);

    if (secondaryLight) {
      findings.push({
        code: 'lighting.sole-source-causality-leak',
        severity: 'p0',
        domain: 'lighting',
        problem: 'Phone-screen-only mode still contains another active illumination source.',
        rootCause: 'A secondary lighting instruction survived inside the positive camera/lighting prose instead of being represented and suppressed as a canonical constraint.',
        mechanism: 'The model can brighten the scene using the secondary source, defeating the intended inverse-square falloff and dark environment.',
        visualConsequence: 'Unexplained face fill, bright room corners, multiple shadow directions, or cinematic-looking illumination.',
        fix: 'Delete the active secondary-source clause. Preserve visible background fixtures only if they are explicitly OFF or non-contributing.',
        patch: {
          operation: 'delete',
          target: 'secondary active light-source clause'
        }
      });
    }
  }

  const supportText = `${scene} ${allPositive}`;
  if (looksSeated(scene) && !hasSeatedSupportPhysics(supportText)) {
    findings.push({
      code: 'physics.seated-support-underconstrained',
      severity: 'p1',
      domain: 'physics',
      problem: 'A seated pose lacks enough support/contact physics to anchor the body to the seat.',
      rootCause: 'The prompt names the seated action without specifying a load-bearing relationship between pelvis, seat surface, backrest, or feet.',
      mechanism: 'The image model may approximate sitting visually without preserving support surfaces or realistic deformation.',
      visualConsequence: 'Floating hips, feet hovering above the floor, body intersecting cushions, or implausible backrest contact.',
      fix: 'Add one compact support clause describing pelvis-to-seat contact, localized compression, and foot/back support only where relevant.',
      patch: {
        operation: 'add-after',
        target: 'the seated pose sentence',
        replacement: 'Body weight is physically supported by the seat with localized cushion/clothing compression and anatomically plausible foot and back contact.'
      }
    });
  }

  if (looksLying(scene) && !hasLyingSupportPhysics(supportText)) {
    findings.push({
      code: 'physics.lying-support-underconstrained',
      severity: 'p1',
      domain: 'physics',
      problem: 'A lying/reclined pose lacks explicit support-surface deformation.',
      rootCause: 'The body pose is described without anchoring torso, pelvis, limbs, pillow, or mattress to gravity-bearing contact surfaces.',
      mechanism: 'The model may preserve the pose silhouette while ignoring how the body deforms the supporting surface.',
      visualConsequence: 'Hovering torso, uncompressed pillow/mattress, or body parts clipping through bedding.',
      fix: 'Add one connected support/compression clause rather than several independent negative prompts.',
      patch: {
        operation: 'add-after',
        target: 'the lying/reclined pose sentence',
        replacement: 'Gravity creates connected, localized support compression beneath the torso and pelvis, with any pillow or mattress deformation matching the actual contact points.'
      }
    });
  }

  const furnitureCount = countFurnitureKinds(scene);
  const spatialAuditApplies = facts.sceneFamily === 'bedroom' || facts.sceneFamily === 'living-room';
  if (spatialAuditApplies && furnitureCount >= 3 && !hasSpatialAnchors(scene)) {
    findings.push({
      code: 'spatial.multi-furniture-layout-underconstrained',
      severity: 'p1',
      domain: 'spatial',
      problem: 'The scene contains several furniture types but does not establish a single relational layout.',
      rootCause: 'Furniture is listed as inventory rather than positioned relative to walls, axes, or neighboring objects.',
      mechanism: 'The image model is free to invent multiple valid floor plans and may choose different placements, orientations, or clearances on each generation.',
      visualConsequence: 'Random furniture placement, blocked circulation, merged furniture, inconsistent room layout, or impossible visibility from the requested camera.',
      fix: 'Add the minimum set of spatial anchors: wall relationship, orientation, and one or two object-to-object relationships. Do not over-specify every centimeter.',
      patch: {
        operation: 'add-after',
        target: 'the visible-environment furniture inventory',
        replacement: 'Anchor the major furniture to one fixed wall/axis layout and state only the object-to-object relationships needed to preserve circulation and camera visibility.'
      }
    });
  }

  if (facts.vehicleRole === 'driver') {
    if (!/steering wheel/i.test(scene) || !/front-left driver(?:'s)? seat/i.test(scene) || !/left-hand-drive/i.test(scene)) {
      findings.push({
        code: 'spatial.driver-cabin-axis-underconstrained',
        severity: 'p0',
        domain: 'spatial',
        problem: 'Driver scene is missing the complete LHD seat-to-steering-wheel spatial axis.',
        rootCause: 'The typed driver role is active but one or more cabin geometry anchors are absent from the scene section.',
        mechanism: 'Vehicle interiors are highly symmetric, so missing semantic anchors make seat swapping and mirrored layouts easy failure modes.',
        visualConsequence: 'Subject on passenger side, steering wheel beside the torso, mirrored dashboard, or center console on the wrong side.',
        fix: 'Restore the single LHD geometry lock rather than adding camera-space left/right guesses.',
        patch: {
          operation: 'add-after',
          target: 'driver scene geometry',
          replacement: "The subject occupies the front-left driver's seat of the left-hand-drive cabin, with the steering wheel centered directly in front of the torso and the center console to the subject's right."
        }
      });
    }
  }

  const styleLeak = hasPositiveStyleLeak(`${scene} ${attire} ${texture} ${camera}`);
  if (styleLeak) {
    findings.push({
      code: `semantic.style-leak.${styleLeak}`,
      severity: 'p1',
      domain: 'semantic',
      problem: `Positive scene text contains the broad style term “${styleLeak}”, which can override narrower realism locks.`,
      rootCause: 'A global aesthetic adjective is present in positive prompt content instead of a narrowly scoped physical description.',
      mechanism: 'Image models often spread broad style tokens across lighting, materials, scale, color grading, and depth of field.',
      visualConsequence: 'Unintended studio polish, cinematic lighting, oversized luxury furniture, glossy materials, or editorial-looking composition.',
      fix: 'Replace the broad style adjective with the exact physical property actually needed, or delete it if it adds no necessary scene fact.',
      patch: {
        operation: 'replace',
        target: styleLeak,
        replacement: 'a narrowly scoped physical/material description'
      }
    });
  }

  return {
    findings,
    hasCritical: findings.some(finding => finding.severity === 'p0'),
    highestSeverity: findHighestSeverity(findings)
  };
};
