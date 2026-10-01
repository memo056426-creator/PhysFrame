import type { LightingKind } from './lighting';
import { buildVehicleGeometry } from './vehicle';

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

export interface PromptFacts {
  hasGlasses: boolean;
  backgroundDynamics: 'empty' | 'casual' | 'busy';
  captureType: 'front-selfie' | 'mirror-selfie' | 'third-person-candid';
  useDigitalZoom: boolean;
  lightingMode: LightingKind;
  timeOfDay: 'morning' | 'midday' | 'afternoon' | 'sunset' | 'night';
}

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

  if (/preserve exact (?:facial )?identity/.test(value)) return 'identity.preserve_exact';
  if (/(?:zero|no|do not|without).*?(?:digital )?(?:skin )?(?:smoothing|airbrushing|beauty skin cleanup)/.test(value)) {
    return 'skin.no_smoothing';
  }
  if (/(?:phone|smartphone) screen.*\b(?:only|sole)\b|\b(?:only|sole)\b.*(?:phone|smartphone) screen/.test(value)) {
    return 'lighting.phone_screen_only';
  }
  if (/office fluorescent|fluorescent office illumination|fluorescent illumination/.test(value)) {
    return 'lighting.office_fluorescent';
  }
  if (/bedside (?:lamp|light).*(?:on|active|provides|illumination|source)/.test(value)) {
    return 'lighting.bedside_on';
  }
  if (/ceiling (?:light|lighting|illumination|practical)/.test(value)) return 'lighting.ceiling_on';
  if (/\bdaylight\b/.test(value)) return 'lighting.daylight';
  if (/street ?lights?.*(?:illuminate|illumination|source|spill)|street illumination/.test(value)) {
    return 'lighting.street_light';
  }
  if (/\bmirror selfie\b/.test(value)) return 'capture.mirror_selfie';
  if (/front camera selfie|front-camera selfie|hand held front camera selfie/.test(value)) {
    return 'capture.front_selfie';
  }
  if (/external photographer|third person photographer|photographer taking (?:the )?(?:group )?shot/.test(value)) {
    return 'capture.external_photographer';
  }
  if (/mirror.*reflection|reflection.*mirror/.test(value)) return 'mirror.reflection_physics';
  if (/selfie arm|shooter anatomy|extended .*arm.*selfie/.test(value)) return 'camera.selfie_arm_geometry';
  if (/left hand drive|\blhd\b|front left driver(?:'s)? seat/.test(value)) return 'vehicle.driver_seat_lhd';
  if (/right hand drive|\brhd\b|front right driver(?:'s)? seat/.test(value)) return 'vehicle.driver_seat_rhd';
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

const sanitizeHandProp = (semantic: PromptSemanticInput): string => {
  if (!isHandHeldFrontSelfie(semantic.captureMechanics)) return semantic.handProp;
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

export const resolveConstraintSetDetailed = (constraints: readonly PromptConstraint[]): ConstraintResolution => {
  const deduped = dedupeLegacyEquivalentText(dedupeByCanonicalId(constraints));
  const removed = new Set<string>();
  const conflicts: ConstraintConflict[] = [];

  for (let leftIndex = 0; leftIndex < deduped.length; leftIndex += 1) {
    const left = deduped[leftIndex];
    if (removed.has(left.id)) continue;

    for (let rightIndex = leftIndex + 1; rightIndex < deduped.length; rightIndex += 1) {
      const right = deduped[rightIndex];
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

  const resolved = deduped
    .filter(constraint => !removed.has(constraint.id))
    .sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]);

  return { constraints: resolved, conflicts };
};

export const resolveConstraintSet = (constraints: readonly PromptConstraint[]): PromptConstraint[] =>
  resolveConstraintSetDetailed(constraints).constraints;

export const buildPromptIR = (semantic: PromptSemanticInput): PromptIR => {
  const vehicleGeometry = buildVehicleGeometry({
    visibleEnvironment: semantic.visibleEnvironment,
    poseAndContact: semantic.poseAndContact
  });
  const handProp = sanitizeHandProp(semantic);
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

  const resolution = resolveConstraintSetDetailed(constraints);
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
