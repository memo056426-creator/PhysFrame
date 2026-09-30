export type ConstraintPriority = 'hard' | 'derived' | 'soft';
export type PromptTarget = 'chatgpt' | 'gemini';

const PRIORITY_WEIGHT: Record<ConstraintPriority, number> = {
  hard: 300,
  derived: 200,
  soft: 100
};

export interface PromptConstraint {
  id: string;
  text: string;
  priority: ConstraintPriority;
  domain: 'identity' | 'capture' | 'physics' | 'lighting' | 'realism' | 'style' | 'negative';
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
  lightingMode: string;
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
}

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

export const resolveConstraintSet = (constraints: readonly PromptConstraint[]): PromptConstraint[] => {
  const byMeaning = new Map<string, PromptConstraint>();

  for (const constraint of constraints) {
    const key = constraintKey(constraint.text) || constraint.id;
    const current = byMeaning.get(key);
    if (!current || PRIORITY_WEIGHT[constraint.priority] > PRIORITY_WEIGHT[current.priority]) {
      byMeaning.set(key, constraint);
    }
  }

  return [...byMeaning.values()].sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]);
};

export const buildPromptIR = (semantic: PromptSemanticInput): PromptIR => {
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
      text: `${semantic.visibleEnvironment}. Activity: ${semantic.poseAndContact}. Background dynamics: ${semantic.backgroundDynamics}.`
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
      text: `${semantic.skinResponse}. Hair: ${semantic.hair}. Expression: ${semantic.expression}. Hand prop: ${semantic.handProp}.`
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
      id: 'camera.imperfection',
      text: 'Preserve ordinary smartphone capture imperfections without inventing impossible optics',
      priority: 'derived',
      domain: 'capture'
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
    ...splitConstraints(semantic.styleConstraints).map((text, index): PromptConstraint => ({
      id: `semantic.${index}`,
      text,
      priority: /^NO |^MUST |^PRESERVE |^ZERO /i.test(text) ? 'hard' : 'derived',
      domain: /light|shadow/i.test(text) ? 'lighting' : /camera|lens|selfie/i.test(text) ? 'capture' : 'realism'
    }))
  ];

  return {
    sections,
    constraints: resolveConstraintSet(constraints),
    negatives: Array.from(new Set(splitNegatives(semantic.negativePrompt))),
    warnings: []
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

  if (facts.lightingMode === 'إضاءة شاشة الهاتف فقط') {
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
