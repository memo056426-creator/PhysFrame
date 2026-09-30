export type ConstraintDomain = 'crowd' | 'hair' | 'skin' | 'symmetry' | 'fabric';

export interface NegativeConstraintRule {
  id: string;
  domain: ConstraintDomain;
  text: string;
}

export interface NegativeConstraintFacts {
  backgroundDynamics: 'empty' | 'casual' | 'busy';
}

const rule = (id: string, domain: ConstraintDomain, text: string): NegativeConstraintRule => ({ id, domain, text });

const CORE_RULES: readonly NegativeConstraintRule[] = [
  rule('hair.volume', 'hair', 'altered hair volume'),
  rule('hair.density', 'hair', 'added hair density'),
  rule('hair.bald-spots', 'hair', 'filled bald spots'),
  rule('hair.wig', 'hair', 'wig'),
  rule('hair.thick', 'hair', 'unnaturally thick hair'),
  rule('hair.line', 'hair', 'altered hairline'),
  rule('skin.plastic', 'skin', 'plastic skin'),
  rule('skin.waxy', 'skin', 'waxy skin'),
  rule('skin.airbrushed', 'skin', 'airbrushed'),
  rule('skin.smoothing', 'skin', 'digital smoothing'),
  rule('skin.filter', 'skin', 'beauty filter'),
  rule('skin.flawless', 'skin', 'flawless skin'),
  rule('skin.makeup', 'skin', 'makeup'),
  rule('skin.glass', 'skin', 'glass skin'),
  rule('skin.cinematic', 'skin', 'cinematic skin'),
  rule('skin.lashes', 'skin', 'perfect eyelashes'),
  rule('skin.glowing-eyes', 'skin', 'glowing eyes'),
  rule('skin.doll', 'skin', 'doll-like appearance'),
  rule('skin.render', 'skin', 'photorealistic render look'),
  rule('skin.porcelain', 'skin', 'porcelain skin'),
  rule('symmetry.perfect', 'symmetry', 'perfect facial symmetry'),
  rule('symmetry.bilateral', 'symmetry', 'artificial bilateral facial symmetry'),
  rule('symmetry.ai', 'symmetry', 'symmetrical AI artifacts'),
  rule('skin.retouched', 'skin', 'over-retouched face'),
  rule('skin.eye-enlarge', 'skin', 'beauty-mode eye enlargement'),
  rule('fabric.spotless', 'fabric', 'digitally spotless clothing'),
  rule('fabric.perfect', 'fabric', 'impossibly perfect fabric')
];

const crowdRules = (mode: NegativeConstraintFacts['backgroundDynamics']): NegativeConstraintRule[] => {
  if (mode === 'empty') {
    return [
      rule('crowd.any-people', 'crowd', 'background people'),
      rule('crowd.any-crowd', 'crowd', 'crowd'),
      rule('crowd.staring', 'crowd', 'background people staring at camera'),
      rule('crowd.posed', 'crowd', 'posed background characters')
    ];
  }

  return [
    rule('crowd.staring', 'crowd', 'background people staring at camera'),
    rule('crowd.posed', 'crowd', 'posed background characters'),
    rule('crowd.stock', 'crowd', 'generic stock-photo crowd'),
    rule('crowd.duplicate', 'crowd', 'duplicated people'),
    rule('crowd.clones', 'crowd', 'cloned faces')
  ];
};

export const buildNegativeConstraintRules = (facts: NegativeConstraintFacts): NegativeConstraintRule[] => {
  const byId = new Map<string, NegativeConstraintRule>();
  for (const item of [...crowdRules(facts.backgroundDynamics), ...CORE_RULES]) byId.set(item.id, item);
  return [...byId.values()];
};

export const buildNegativeConstraints = (facts: NegativeConstraintFacts): string[] =>
  buildNegativeConstraintRules(facts).map(item => item.text);
