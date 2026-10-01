import type { LightingKind } from './lighting';
import type { SceneFacts } from './sceneFacts';
import { buildVehicleGeometry, buildVehicleGeometryForRole } from './vehicle';

export type ConstraintPriority = 'hard' | 'derived' | 'soft';
export type PromptTarget = 'chatgpt' | 'gemini';
export type PromptConstraintDomain =
  | 'identity'
  | 'skin'
  | 'camera'
  | 'capture'
  | 'physics'
  | 'lighting'
  | 'mirror'
  | 'phone'
  | 'vehicle'
  | 'realism'
  | 'style'
  | 'negative';

const PRIORITY_WEIGHT: Record<ConstraintPriority, number> = {
  hard: 300,
  derived: 200,
  soft: 100
};

export interface PromptConstraint {
  id: string;
  text: string;
  priority: ConstraintPriority;
  domain: PromptConstraintDomain;
}

export interface ConstraintConflict {
  winner?: string;
  loser?: string;
  unresolved: boolean;
  reason: string;
}

export interface ConstraintResolution {
  constraints: PromptConstraint[];
  conflicts: ConstraintConflict[];
}

interface ConstraintConflictRule {
  left: string;
  right: string;
  preferred?: string;
  reason: string;
}

export interface PromptIRSection {
  id: 'identity' | 'scene' | 'attire' | 'camera' | 'texture';
  title: string;
  text: string;
  priority: ConstraintPriority;
}

export type PromptFacts = Pick<
  SceneFacts,
  'hasGlasses' | 'backgroundDynamics' | 'captureType' | 'useDigitalZoom' | 'lightingMode' | 'timeOfDay'
>;

export interface PromptSemanticInput {
  identity: string;
  body: string;
  captureMechanics: string;
  hair: string;
  expression: string;
  outfit: string;
  outfitPhysics: string;
  poseAndContact: string;
  visibleEnvironment: string;
  lighting: string;
  skinResponse: string;
  cameraRealism: string;
  styleConstraints: string;
  handProp: string;
  facialHair: string;
  flashDetails: string;
  shadowBehavior: string;
  backgroundDynamics: string;
  negativePrompt: string;
}

export interface PromptIR {
  sections: PromptIRSection[];
  constraints: PromptConstraint[];
  negatives: string[];
  warnings: string[];
  conflicts?: ConstraintConflict[];
}

const CONFLICT_RULES: readonly ConstraintConflictRule[] = [
  {
    left: 'lighting.phone_screen_only',
    right: 'lighting.ceiling_on',
    preferred: 'lighting.phone_screen_only',
    reason: 'phone-screen-only lighting excludes active ceiling lighting'
  },
  {
    left: 'lighting.phone_screen_only',
    right: 'lighting.bedside_on',
    preferred: 'lighting.phone_screen_only',
    reason: 'phone-screen-only lighting excludes an active bedside light'
  },
  {
    left: 'lighting.phone_screen_only',
    right: 'lighting.daylight',
    preferred: 'lighting.phone_screen_only',
    reason: 'phone-screen-only lighting excludes daylight contribution'
  },
  {
    left: 'lighting.phone_screen_only',
    right: 'lighting.office_fluorescent',
    preferred: 'lighting.phone_screen_only',
    reason: 'phone-screen-only lighting excludes office fluorescent illumination'
  },
  {
    left: 'lighting.phone_screen_only',
    right: 'lighting.street_light',
    preferred: 'lighting.phone_screen_only',
    reason: 'phone-screen-only lighting excludes street-light contribution'
  },
  {
    left: 'capture.front_selfie',
    right: 'capture.external_photographer',
    preferred: 'capture.front_selfie',
    reason: 'a hand-held front selfie cannot also be captured by an external photographer'
  },
  {
    left: 'capture.front_selfie',
    right: 'mirror.reflection_physics',
    preferred: 'capture.front_selfie',
    reason: 'front-camera selfie capture does not require mirror-selfie reflection physics'
  },
  {
    left: 'capture.mirror_selfie',
    right: 'camera.selfie_arm_geometry',
    preferred: 'capture.mirror_selfie',
    reason: 'mirror-selfie capture must not inherit front-camera selfie-arm geometry'
  },
  {
    left: 'vehicle.driver_seat_lhd',
    right: 'vehicle.driver_seat_rhd',
    preferred: 'vehicle.driver_seat_lhd',
    reason: 'the selected LHD driver-seat lock excludes right-hand-drive placement'
  },
  {
    left: 'capture.front_selfie',
    right: 'capture.mirror_selfie',
    reason: 'front-selfie and mirror-selfie are mutually exclusive capture modes'
  }
];

const splitConstraints = (value: string): string[] => value
  .split(/\.\s+|;\s*/)
  .map(item => item.trim())
  .filter(Boolean);

const splitNegatives = (value: string): string[] => value
  .split(',')
  .map(item => item.trim())
  .filter(Boolean);

const constraintKey = (text: string): string => text
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const normalizedConstraintText = (text: string): string => text
  .toLowerCase()
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export const inferCanonicalConstraintId = (text: string, fallbackId: string): string => {
  const value = normalizedConstraintText(text);
  const isProhibition = /^(?:no\b|do not\b|without\b)/.test(value);

  if (/preserve exact (?:facial )?identity/.test(value)) return 'identity.preserve_exact';
  if (/(?:zero|no|do not|without).*?(?:digital skin smoothing|skin smoothing|smooth skin|digital smoothing|airbrushing|beauty skin cleanup)/.test(value)) {
    return 'skin.no_smoothing';
  }
  if (!isProhibition && /(?:phone|smartphone) screen.*\b(?:only|sole)\b|\b(?:only|sole)\b.*(?:phone|smartphone) screen/.test(value)) {
    return 'lighting.phone_screen_only';
  }
  if (!isProhibition && /office fluorescent|fluorescent office illumination|fluorescent illumination/.test(value)) {
    return 'lighting.office_fluorescent';
  }
  if (!isProhibition && /bedside (?:lamp|light).*(?:on|active|provides|illumination|source)/.test(value)) {
    return 'lighting.bedside_on';
  }
  if (!isProhibition && /ceiling (?:light|lighting|illumination|practical)/.test(value)) return 'lighting.ceiling_on';
  if (!isProhibition && /\bdaylight\b/.test(value)) return 'lighting.daylight';
  if (!isProhibition && /street ?lights?.*(?:illuminate|illumination|source|spill)|street illumination/.test(value)) {
    return 'lighting.street_light';
  }
  if (!isProhibition && /\bmirror selfie\b/.test(value)) return 'capture.mirror_selfie';
  if (!isProhibition && /front camera selfie|front-camera selfie|hand held front camera selfie/.test(value)) {
    return 'capture.front_selfie';
  }
  if (!isProhibition && /external photographer|third person photographer|photographer taking (?:the )?(?:group )?shot/.test(value)) {
    return 'capture.external_photographer';
  }
  if (!isProhibition && /mirror.*reflection|reflection.*mirror/.test(value)) return 'mirror.reflection_physics';
  if (!isProhibition && /selfie arm|shooter anatomy|extended .*arm.*selfie/.test(value)) return 'camera.selfie_arm_geometry';
  if (!isProhibition && /front left driver(?:'s)? seat|left hand drive.*driver(?:'s)? seat|driver(?:'s)? seat.*left hand drive/.test(value)) {
    return 'vehicle.driver_seat_lhd';
  }
  if (!isProhibition && /front right driver(?:'s)? seat|right hand drive.*driver(?:'s)? seat|driver(?:'s)? seat.*right hand drive/.test(value)) {
    return 'vehicle.driver_seat_rhd';
  }
  if (/no impossible lighting|no source less fill light/.test(value)) return 'lighting.no-impossible';
  if (/no perfect facial or body symmetry|no perfect facial symmetry/.test(value)) return 'realism.no-perfect-symmetry';
  if (/ordinary handheld imperfection|ordinary smartphone capture imperfections/.test(value)) {
    return 'camera.capture_imperfection';
  }

  return fallbackId;
};

const isHandHeldFrontSelfie = (captureMechanics: string): boolean => {
  const text = captureMechanics.toLowerCase();
  if (text.includes('mirror selfie')) return false;
  return text.includes('front-camera selfie') || (text.includes('selfie') && text.includes('hand-held')) || text.includes('group crew selfie');
};

const sanitizeHandProp = (semantic: PromptSemanticInput, facts?: SceneFacts): string => {
  const frontSelfie = facts ? facts.captureType === 'front-selfie' : isHandHeldFrontSelfie(semantic.captureMechanics);
  if (!frontSelfie) return semantic.handProp;
  if (/holding smartphone|screen visible|phone in one hand/i.test(semantic.handProp)) return '';
  return semantic.handProp;
};

const dedupeByCanonicalId = (constraints: readonly PromptConstraint[]): PromptConstraint[] => {
  const byId = new Map<string, PromptConstraint>();

  for (const constraint of constraints) {
    const current = byId.get(constraint.id);
    if (!current || PRIORITY_WEIGHT[constraint.priority] > PRIORITY_WEIGHT[current.priority]) {
      byId.set(constraint.id, constraint);
    }
  }

  return [...byId.values()];
};

const dedupeLegacyEquivalentText = (constraints: readonly PromptConstraint[]): PromptConstraint[] => {
  const byMeaning = new Map<string, PromptConstraint>();

  for (const constraint of constraints) {
    const key = constraintKey(constraint.text) || constraint.id;
    const current = byMeaning.get(key);
    if (!current || PRIORITY_WEIGHT[constraint.priority] > PRIORITY_WEIGHT[current.priority]) {
      byMeaning.set(key, constraint);
    }
  }

  return [...byMeaning.values()];
};

const findConflictRule = (leftId: string, rightId: string): ConstraintConflictRule | undefined =>
  CONFLICT_RULES.find(rule =>
    (rule.left === leftId && rule.right === rightId) ||
    (rule.left === rightId && rule.right === leftId)
  );

interface FactSuppression {
  loser: string;
  winner?: string;
  reason: string;
}

const buildFactSuppressions = (facts: SceneFacts): FactSuppression[] => {
  const suppressions: FactSuppression[] = [];
  const add = (loser: string, winner: string | undefined, reason: string): void => {
    suppressions.push({ loser, winner, reason });
  };

  if (facts.captureType === 'front-selfie') {
    add('capture.mirror_selfie', 'capture.front_selfie', 'typed capture mode is front-selfie');
    add('capture.external_photographer', 'capture.front_selfie', 'typed capture mode is subject-operated front-selfie');
    add('mirror.reflection_physics', 'capture.front_selfie', 'front-selfie does not require mirror-selfie reflection physics');
  } else if (facts.captureType === 'mirror-selfie') {
    add('capture.front_selfie', 'capture.mirror_selfie', 'typed capture mode is mirror-selfie');
    add('capture.external_photographer', 'capture.mirror_selfie', 'typed capture mode is subject-operated mirror-selfie');
    add('camera.selfie_arm_geometry', 'capture.mirror_selfie', 'mirror-selfie does not use front-camera selfie-arm geometry');
  } else {
    add('capture.front_selfie', 'capture.external_photographer', 'typed capture mode is third-person candid');
    add('capture.mirror_selfie', 'capture.external_photographer', 'typed capture mode is third-person candid');
    add('camera.selfie_arm_geometry', 'capture.external_photographer', 'third-person candid does not use selfie-arm geometry');
    add('mirror.reflection_physics', 'capture.external_photographer', 'third-person candid does not require mirror-selfie reflection physics');
  }

  if (facts.lightingMode === 'phone-screen' && facts.lightingSoleAmbientSource) {
    for (const loser of [
      'lighting.ceiling_on',
      'lighting.bedside_on',
      'lighting.daylight',
      'lighting.office_fluorescent',
      'lighting.street_light'
    ]) {
      add(loser, 'lighting.phone_screen_only', 'typed phone-screen lighting is the sole ambient/practical source');
    }
  } else {
    add('lighting.phone_screen_only', undefined, 'typed lighting mode is not phone-screen-only');
  }

  if (facts.vehicleRole === 'driver' && facts.vehicleDriveSide === 'lhd') {
    add('vehicle.driver_seat_rhd', 'vehicle.driver_seat_lhd', 'typed vehicle role locks the driver to the LHD position');
  } else {
    add('vehicle.driver_seat_lhd', undefined, 'typed vehicle role is not an LHD driver');
    add('vehicle.driver_seat_rhd', undefined, 'typed vehicle role is not an RHD driver');
  }

  return suppressions;
};

const resolveConstraintsAgainstFacts = (
  constraints: readonly PromptConstraint[],
  facts?: SceneFacts
): ConstraintResolution => {
  if (!facts) return { constraints: [...constraints], conflicts: [] };

  const suppressionByLoser = new Map(buildFactSuppressions(facts).map(item => [item.loser, item]));
  const kept: PromptConstraint[] = [];
  const conflicts: ConstraintConflict[] = [];

  for (const constraint of constraints) {
    const suppression = suppressionByLoser.get(constraint.id);
    if (!suppression) {
      kept.push(constraint);
      continue;
    }

    conflicts.push({
      winner: suppression.winner,
      loser: constraint.id,
      unresolved: false,
      reason: suppression.reason
    });
  }

  return { constraints: kept, conflicts };
};

export const resolveConstraintSetDetailed = (
  constraints: readonly PromptConstraint[],
  facts?: SceneFacts
): ConstraintResolution => {
  const deduped = dedupeLegacyEquivalentText(dedupeByCanonicalId(constraints));
  const factResolution = resolveConstraintsAgainstFacts(deduped, facts);
  const factResolved = factResolution.constraints;
  const removed = new Set<string>();
  const conflicts: ConstraintConflict[] = [...factResolution.conflicts];

  for (let leftIndex = 0; leftIndex < factResolved.length; leftIndex += 1) {
    const left = factResolved[leftIndex];
    if (removed.has(left.id)) continue;

    for (let rightIndex = leftIndex + 1; rightIndex < factResolved.length; rightIndex += 1) {
      const right = factResolved[rightIndex];
      if (removed.has(right.id)) continue;

      const rule = findConflictRule(left.id, right.id);
      if (!rule) continue;

      const leftWeight = PRIORITY_WEIGHT[left.priority];
      const rightWeight = PRIORITY_WEIGHT[right.priority];
      let winner: PromptConstraint | undefined;
      let loser: PromptConstraint | undefined;

      if (leftWeight > rightWeight) {
        winner = left;
        loser = right;
      } else if (rightWeight > leftWeight) {
        winner = right;
        loser = left;
      } else if (rule.preferred === left.id) {
        winner = left;
        loser = right;
      } else if (rule.preferred === right.id) {
        winner = right;
        loser = left;
      }

      if (!winner || !loser) {
        conflicts.push({
          unresolved: true,
          reason: `${rule.reason}; equal-priority constraints require an explicit winner`
        });
        continue;
      }

      removed.add(loser.id);
      conflicts.push({
        winner: winner.id,
        loser: loser.id,
        unresolved: false,
        reason: rule.reason
      });
    }
  }

  const resolved = factResolved
    .filter(constraint => !removed.has(constraint.id))
    .sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]);

  return { constraints: resolved, conflicts };
};

export const resolveConstraintSet = (
  constraints: readonly PromptConstraint[],
  facts?: SceneFacts
): PromptConstraint[] => resolveConstraintSetDetailed(constraints, facts).constraints;

export const buildPromptIR = (semantic: PromptSemanticInput, facts?: SceneFacts): PromptIR => {
  const vehicleGeometry = facts
    ? buildVehicleGeometryForRole(facts.vehicleRole)
    : buildVehicleGeometry({
        visibleEnvironment: semantic.visibleEnvironment,
        poseAndContact: semantic.poseAndContact
      });
  const handProp = sanitizeHandProp(semantic, facts);
  const sceneGeometry = vehicleGeometry.sceneGeometry ? ` ${vehicleGeometry.sceneGeometry}` : '';

  const sections: PromptIRSection[] = [
    {
      id: 'identity',
      title: 'SUBJECT & IDENTITY',
      priority: 'hard',
      text: `${semantic.identity} Facial hair: ${semantic.facialHair}.`
    },
    {
      id: 'camera',
      title: 'CAMERA & LIGHTING',
      priority: 'hard',
      text: `${semantic.captureMechanics}. Light behavior: ${semantic.lighting}. ${semantic.flashDetails} Lens effects: ${semantic.cameraRealism}.`
    },
    {
      id: 'scene',
      title: 'SCENE & ACTION',
      priority: 'derived',
      text: `${semantic.visibleEnvironment}. Activity: ${semantic.poseAndContact}.${sceneGeometry} Background dynamics: ${semantic.backgroundDynamics}.`
    },
    {
      id: 'attire',
      title: 'ATTIRE',
      priority: 'derived',
      text: `${semantic.outfit}. Fabric behavior: ${semantic.outfitPhysics}.`
    },
    {
      id: 'texture',
      title: 'TEXTURE DETAILS',
      priority: 'soft',
      text: `${semantic.skinResponse}. Hair: ${semantic.hair}. Expression: ${semantic.expression}. Hand prop: ${handProp}.`
    }
  ];

  const constraints: PromptConstraint[] = [
    {
      id: 'physics.weight',
      text: 'Ensure natural weight distribution and physically plausible fabric compression',
      priority: 'hard',
      domain: 'physics'
    },
    {
      id: 'camera.capture_imperfection',
      text: 'Preserve ordinary smartphone capture imperfections without inventing impossible optics',
      priority: 'derived',
      domain: 'camera'
    },
    {
      id: 'realism.no-perfect-symmetry',
      text: 'NO perfect facial or body symmetry',
      priority: 'hard',
      domain: 'realism'
    },
    {
      id: 'physics.no-floating',
      text: 'NO floating objects or broken physical contact',
      priority: 'hard',
      domain: 'physics'
    },
    {
      id: 'lighting.no-impossible',
      text: 'NO impossible lighting or source-less fill light',
      priority: 'hard',
      domain: 'lighting'
    },
    ...vehicleGeometry.hardConstraints.map((text, index): PromptConstraint => ({
      id: inferCanonicalConstraintId(text, `vehicle.${vehicleGeometry.role}.${index}`),
      text,
      priority: 'hard',
      domain: /left-hand-drive|right-hand-drive|driver(?:'s)? seat/i.test(text) ? 'vehicle' : 'physics'
    })),
    ...splitConstraints(semantic.styleConstraints).map((text, index): PromptConstraint => {
      const id = inferCanonicalConstraintId(text, `semantic.${index}`);
      return {
        id,
        text,
        priority: /^NO |^MUST |^PRESERVE |^ZERO /i.test(text) ? 'hard' : 'derived',
        domain: id.startsWith('identity.')
          ? 'identity'
          : id.startsWith('skin.')
            ? 'skin'
            : id.startsWith('lighting.')
              ? 'lighting'
              : id.startsWith('mirror.')
                ? 'mirror'
                : id.startsWith('vehicle.')
                  ? 'vehicle'
                  : id.startsWith('camera.')
                    ? 'camera'
                    : id.startsWith('capture.')
                      ? 'capture'
                      : /light|shadow/i.test(text)
                        ? 'lighting'
                        : /camera|lens|selfie/i.test(text)
                          ? 'capture'
                          : 'realism'
      };
    })
  ];

  const resolution = resolveConstraintSetDetailed(constraints, facts);
  const unresolvedWarnings = resolution.conflicts
    .filter(conflict => conflict.unresolved)
    .map(conflict => `unresolved-constraint-conflict:${conflict.reason}`);

  return {
    sections,
    constraints: resolution.constraints,
    negatives: Array.from(new Set([...splitNegatives(semantic.negativePrompt), ...vehicleGeometry.negativeConstraints])),
    warnings: unresolvedWarnings,
    conflicts: resolution.conflicts
  };
};

const positiveText = (ir: PromptIR): string => [
  ...ir.sections.map(section => section.text),
  ...ir.constraints.map(constraint => constraint.text)
].join(' ');

export const lintPromptIR = (ir: PromptIR, facts: PromptFacts): string[] => {
  const text = positiveText(ir).toLowerCase();
  const warnings: string[] = [];

  if (!facts.hasGlasses && /(eyeglass|glasses lens|eyeglasses|spectacle)/i.test(text)) {
    warnings.push('eyewear-present-while-hasGlasses-false');
  }

  if (facts.backgroundDynamics === 'empty' && /(indifferent pedestrians|uniformed colleagues|gym members|household member|passing pedestrians)/i.test(text)) {
    warnings.push('background-people-present-while-background-empty');
  }

  if (facts.captureType !== 'third-person-candid' && /digital zoom artifacts|watercolor-like upscaling|in-sensor crop/i.test(text)) {
    warnings.push('digital-zoom-artifacts-outside-third-person-candid');
  }

  if (!facts.useDigitalZoom && /digital zoom artifacts|watercolor-like upscaling|in-sensor crop/i.test(text)) {
    warnings.push('digital-zoom-artifacts-while-disabled');
  }

  if (facts.captureType === 'front-selfie' && /holding smartphone in one hand, screen visible/i.test(text)) {
    warnings.push('front-selfie-visible-second-phone');
  }

  if (facts.lightingMode === 'phone-screen') {
    const conflictingPractical = /(dashboard ambient lighting|streetlights illuminate|bedside lamp provides|ceiling illumination|fluorescent office illumination)/i.test(text);
    if (conflictingPractical) warnings.push('phone-screen-only-has-secondary-ambient-source');
    if (facts.timeOfDay !== 'night') warnings.push('phone-screen-only-not-night');
  }

  return Array.from(new Set(warnings));
};

const section = (ir: PromptIR, id: PromptIRSection['id']): PromptIRSection => {
  const found = ir.sections.find(item => item.id === id);
  if (!found) throw new Error(`Missing PromptIR section: ${id}`);
  return found;
};

export const renderPromptIR = (ir: PromptIR, target: PromptTarget): string => {
  const identity = section(ir, 'identity');
  const scene = section(ir, 'scene');
  const attire = section(ir, 'attire');
  const camera = section(ir, 'camera');
  const texture = section(ir, 'texture');
  const constraintText = ir.constraints.map(item => `- ${item.text}`).join('\n');
  const negativeText = ir.negatives.join(', ');

  if (target === 'chatgpt') {
    return `CRITICAL INSTRUCTION: Generate a raw, unedited, authentic smartphone snapshot. STRICTLY FORBIDDEN: Do NOT apply beautification, skin smoothing, airbrushing, artistic filters, CGI styling, stock-photo polish, or professional studio treatment. The image must read as an ordinary imperfect real-world phone capture.\n\n${identity.title}: ${identity.text}\n${scene.title}: ${scene.text}\n${attire.title}: ${attire.text}\n${camera.title}: ${camera.text}\n${texture.title}: ${texture.text}\n\nPHYSICS & REALISM CONSTRAINTS:\n${constraintText}\n\nNEGATIVE PROMPT: ${negativeText}.`;
  }

  return `Create a highly realistic, raw smartphone photograph with no beautification or render-like polish.\n\n${identity.title}: ${identity.text}\n${scene.title}: ${scene.text}\n${attire.title}: ${attire.text}\n${camera.title}: ${camera.text}\n${texture.title}: ${texture.text}\n\nSTRICT REALISM CONSTRAINTS:\n${constraintText}\n\nUse the camera geometry, focal behavior, distance, and lens characteristics already specified above. Do not substitute generic camera specifications that contradict the selected capture mode.\n\nNEGATIVE PROMPT: ${negativeText}.`;
};
