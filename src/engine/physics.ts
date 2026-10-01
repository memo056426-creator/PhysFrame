import { getPoseContactKind, type PoseId } from '../data/poses';

export type ClothingCondition = 'crisp' | 'worn-all-day' | 'vintage-washed';
export type CaptureType = 'front-selfie' | 'mirror-selfie' | 'third-person-candid';
export type FacialHairState = 'clean-shaven' | '3-day-stubble' | 'full-beard-neat' | 'full-beard-unkempt';

export type PhysicsDomain = 'skin' | 'hair' | 'fabric' | 'contact' | 'eyewear';
export type PhysicsPriority = 'hard' | 'derived' | 'soft';

export interface PhysicsRule {
  id: string;
  domain: PhysicsDomain;
  priority: PhysicsPriority;
  text: string;
}

export interface PhysicsFacts {
  hasGlasses: boolean;
  clothingCondition: ClothingCondition;
  captureType: CaptureType;
  pose: PoseId | '';
  handProp: string;
  facialHairState: FacialHairState;
}

export interface PhysicalProfile {
  skinResponse: string;
  hairCondition: string;
  fabricBehavior: string[];
  contactPhysics: string[];
  realismConstraints: string[];
  eyewearLensEffects: string[];
  rules: PhysicsRule[];
}

const rule = (
  id: string,
  domain: PhysicsDomain,
  priority: PhysicsPriority,
  text: string
): PhysicsRule => ({ id, domain, priority, text });

const BASE_SKIN_RULES: readonly PhysicsRule[] = [
  rule('skin.raw-chemistry', 'skin', 'hard', 'untouched real human skin chemistry with microscopically visible vellus hair (peach fuzz) and uneven natural melanin distribution'),
  rule('skin.subsurface', 'skin', 'derived', 'subtle subsurface scattering visible on ears and nose tip with micro-specular highlights from natural skin oils'),
  rule('skin.no-smoothing', 'skin', 'hard', 'ZERO digital skin smoothing, zero airbrushing, unpolished raw human skin, clearly visible enlarged micro-pores, subtle microscopic skin texture irregularities, fine expression lines around eyes and mouth, completely unpowdered skin with natural uncorrected texture'),
  rule('skin.eye-imperfection', 'skin', 'hard', 'slightly realistic tired eyes, natural imperfect eyelashes that clump together randomly, subtle natural dark circles under eyes, unglamorous real-world facial expression'),
  rule('skin.t-zone', 'skin', 'derived', 'natural uneven T-zone oiliness with slightly stronger unpowdered sheen on the forehead and nose than on the cheeks')
];

const BASE_HAIR_RULES: readonly PhysicsRule[] = [
  rule('hair.biological-density', 'hair', 'hard', 'maintains the exact biological hair density, volume, hairline, scalp visibility, and natural texture from the reference image'),
  rule('hair.strays', 'hair', 'derived', 'individual stray hairs remain visible with no helmet-like perfect styling'),
  rule('hair.no-fill', 'hair', 'hard', 'DO NOT artificially thicken hair, fill sparse areas, move the hairline, or conceal natural scalp visibility')
];

const BASE_FABRIC_RULES: readonly PhysicsRule[] = [
  rule('fabric.lint', 'fabric', 'soft', 'microscopic lint fibers visible only where light catches the fabric'),
  rule('fabric.dust', 'fabric', 'soft', 'a few sparse natural dust specks rather than a digitally spotless surface'),
  rule('fabric.micro-wrinkles', 'fabric', 'hard', 'non-uniform physically plausible micro-wrinkles and pressure creases instead of perfectly smoothed cloth')
];

const EYEWEAR_RULES: readonly PhysicsRule[] = [
  rule('eyewear.refraction', 'eyewear', 'derived', 'subtle optical refraction through the thicker edge of the glasses lens causing minute natural cheekbone displacement when geometry permits'),
  rule('eyewear.screen-reflection', 'eyewear', 'soft', 'microscopic smartphone-screen reflection visible in one lens only when source angle and lighting permit'),
  rule('eyewear.fit', 'eyewear', 'hard', 'PRESERVE the exact eyeglass frame shape, size, color, fit, lens geometry, bridge contact, temple position, and realistic pressure points from the reference image')
];

const rulesToText = (rules: readonly PhysicsRule[]): string => rules.map(item => item.text).join(', ');

const getClothingConditionRules = (condition: ClothingCondition): PhysicsRule[] => {
  if (condition === 'worn-all-day') {
    return [
      rule('fabric.worn-creases', 'fabric', 'derived', 'irregular deeper horizontal creases at elbows and waist'),
      rule('fabric.worn-bunching', 'fabric', 'derived', 'random unsymmetrical fabric bunching'),
      rule('fabric.worn-ironing', 'fabric', 'derived', 'localized realistic wrinkles with partial loss of fresh ironing')
    ];
  }
  if (condition === 'vintage-washed') {
    return [
      rule('fabric.vintage-dye', 'fabric', 'derived', 'subtly faded fabric dye'),
      rule('fabric.vintage-fray', 'fabric', 'derived', 'slight wear and micro-fraying at collar and sleeve edges'),
      rule('fabric.vintage-matte', 'fabric', 'derived', 'soft worn-in matte texture')
    ];
  }
  return [];
};

const getContactRules = (facts: PhysicsFacts): PhysicsRule[] => {
  const rules: PhysicsRule[] = [];

  if (facts.captureType === 'front-selfie') {
    rules.push(rule(
      'contact.selfie-arm',
      'contact',
      'hard',
      'one arm clearly extended holding the camera with asymmetrical shoulder elevation, visible clavicle tension on the camera-holding side, subtle torso compensation, and the clothing collar shifted slightly by the raised arm'
    ));
  }

  const poseContactKind = getPoseContactKind(facts.pose);
  if (poseContactKind === 'seated') {
    rules.push(rule(
      'contact.seated-weight',
      'contact',
      'hard',
      'natural weight distribution with clothing compressing realistically against the sitting surface and localized fabric bunching at hips and knees'
    ));
  } else if (poseContactKind === 'leaning') {
    rules.push(rule(
      'contact.leaning-weight',
      'contact',
      'hard',
      'clear physical support point carrying partial body weight with natural fabric tension and stretching at the contact area'
    ));
  }

  if (facts.handProp === 'phone') {
    rules.push(rule('contact.phone-grip', 'contact', 'derived', 'hand gripping the phone naturally with believable finger pressure and thumb placement at the screen edge'));
  } else if (facts.handProp === 'car-keys') {
    rules.push(rule('contact.keys-grip', 'contact', 'derived', 'fingers wrapped naturally around the key fob with localized grip tension'));
  } else if (facts.handProp === 'coffee-cup') {
    rules.push(rule('contact.cup-grip', 'contact', 'derived', 'hand wrapped naturally around the cup with believable finger spacing and grip pressure'));
  }

  return rules;
};

const getFacialHairSkinRules = (state: FacialHairState): PhysicsRule[] => {
  if (state === '3-day-stubble') {
    return [rule('skin.stubble', 'skin', 'derived', 'visible coarse stubble texture on jawline and cheeks with individual follicles catching light')];
  }
  if (state === 'full-beard-unkempt') {
    return [rule('skin.beard-uneven', 'skin', 'derived', 'natural beard growth with slight unevenness and visible stray hairs')];
  }
  return [];
};

export const buildPhysicalProfile = (facts: PhysicsFacts): PhysicalProfile => {
  const skinRules = [...BASE_SKIN_RULES, ...getFacialHairSkinRules(facts.facialHairState)];
  const hairRules = [...BASE_HAIR_RULES];
  const fabricRules = [...BASE_FABRIC_RULES, ...getClothingConditionRules(facts.clothingCondition)];
  const contactRules = getContactRules(facts);
  const eyewearRules = facts.hasGlasses ? [...EYEWEAR_RULES] : [];
  const rules = [...skinRules, ...hairRules, ...fabricRules, ...contactRules, ...eyewearRules];

  return {
    skinResponse: rulesToText(skinRules),
    hairCondition: rulesToText(hairRules),
    fabricBehavior: fabricRules.map(item => item.text),
    contactPhysics: contactRules.map(item => item.text),
    realismConstraints: eyewearRules.filter(item => item.priority === 'hard').map(item => item.text),
    eyewearLensEffects: eyewearRules.filter(item => item.priority !== 'hard').map(item => item.text),
    rules
  };
};

const WRINKLE_FREE_PATTERN = /\b(?:wrinkle[- ]?free|crease[- ]?free|perfectly smooth(?:ed)? cloth)\b/i;
const WRINKLE_REALISM_PATTERN = /\b(?:micro[- ]?wrinkles?|pressure creases?|realistic wrinkles?|natural gravity folds?|fabric bunching)\b/i;
const NEGATED_WRINKLE_FREE_PATTERN = /\b(?:instead of|rather than|not|no|without)\s+(?:a\s+)?(?:wrinkle[- ]?free|crease[- ]?free|perfectly smooth(?:ed)? cloth)\b/gi;

const hasPositiveWrinkleFreeClaim = (text: string): boolean =>
  WRINKLE_FREE_PATTERN.test(text.replace(NEGATED_WRINKLE_FREE_PATTERN, ''));

export interface FabricMergeResult {
  text: string;
  items: string[];
  warnings: string[];
}

export const mergeFabricPhysics = (
  outfitPhysics: readonly string[],
  derivedPhysics: readonly string[]
): FabricMergeResult => {
  const warnings: string[] = [];
  const hasWrinkleRealism = derivedPhysics.some(item => WRINKLE_REALISM_PATTERN.test(item));

  const sanitizedOutfit = outfitPhysics.map(item => {
    if (hasWrinkleRealism && WRINKLE_FREE_PATTERN.test(item)) {
      warnings.push('fabric:absolute-wrinkle-free-normalized');
      return item
        .replace(/smooth wrinkle[- ]?free fall/gi, 'smooth relaxed fall with only subtle gravity creases')
        .replace(/wrinkle[- ]?free/gi, 'lightly creased')
        .replace(/crease[- ]?free/gi, 'lightly creased');
    }
    return item;
  });

  const items = Array.from(new Set([...sanitizedOutfit, ...derivedPhysics].map(item => item.trim()).filter(Boolean)));
  return { text: items.join(', '), items, warnings };
};

export interface PhysicsLintFacts {
  hasGlasses: boolean;
  captureType: CaptureType;
}

export const lintPhysicalText = (text: string, facts: PhysicsLintFacts): string[] => {
  const lower = text.toLowerCase();
  const warnings: string[] = [];

  if (hasPositiveWrinkleFreeClaim(text) && WRINKLE_REALISM_PATTERN.test(text)) {
    warnings.push('physics:fabric-wrinkle-contradiction');
  }

  if (!facts.hasGlasses && /\b(?:eyeglass|eyewear|glasses lens|glasses frame)\b/i.test(text)) {
    warnings.push('physics:eyewear-leak-without-glasses');
  }

  if (facts.captureType !== 'front-selfie' && /asymmetrical shoulder elevation|camera-holding side|clothing collar shifted slightly by the raised arm/i.test(text)) {
    warnings.push('physics:selfie-anatomy-outside-front-selfie');
  }

  if (/added hair density|artificially thicken hair|filled bald spots?/i.test(lower) && !/do not|no added|without/i.test(lower)) {
    warnings.push('physics:hair-density-increase');
  }

  return Array.from(new Set(warnings));
};
