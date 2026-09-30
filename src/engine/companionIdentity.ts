export type CompanionIdentitySlotId = 'A' | 'B' | 'C';
export type CompanionIdentityCount = 1 | 2 | 3;

export interface CompanionIdentitySlot {
  id: CompanionIdentitySlotId;
  spatialAnchor: string;
  faceShape: string;
  jawGeometry: string;
  eyeGeometry: string;
  noseGeometry: string;
  hairGeometry: string;
  facialHair: string;
}

export interface CompanionIdentityPlan {
  slots: CompanionIdentitySlot[];
  referenceIsolationRule: string;
  pairwiseSeparationRule: string;
  spatialLockRule: string;
  slotDescriptions: string;
  negativeConstraints: string[];
}

const IDENTITY_SLOTS: readonly CompanionIdentitySlot[] = [
  {
    id: 'A',
    spatialAnchor: 'left side of frame, beside and slightly behind the primary subject',
    faceShape: 'long oval face with a slightly taller mid-face',
    jawGeometry: 'narrower jaw with a softly tapered chin',
    eyeGeometry: 'slightly deep-set almond eyes with moderately close spacing',
    noseGeometry: 'straight narrow nasal bridge with a longer refined tip',
    hairGeometry: 'naturally wavy dark hair with a modestly uneven mature hairline',
    facialHair: 'light short stubble with visibly non-uniform cheek density'
  },
  {
    id: 'B',
    spatialAnchor: 'center-rear of the group, clearly behind the primary subject rather than sharing the same facial plane',
    faceShape: 'broader square face with a shorter mid-face',
    jawGeometry: 'wide angular jaw and broader chin',
    eyeGeometry: 'more rounded eyes with visibly wider spacing and heavier upper lids',
    noseGeometry: 'shorter broader nose with a wider bridge and rounder tip',
    hairGeometry: 'short coarse-to-curly dark hair with a different temple shape and hairline contour',
    facialHair: 'clean shaven or extremely faint shadow, clearly unlike Companion A'
  },
  {
    id: 'C',
    spatialAnchor: 'right side of frame, beside and slightly behind the primary subject',
    faceShape: 'rectangular face with prominent cheekbone width and a longer lower face',
    jawGeometry: 'medium-width jaw with a distinct pointed-to-square chin transition',
    eyeGeometry: 'narrower slightly hooded eyes with asymmetric brow height and medium-wide spacing',
    noseGeometry: 'stronger convex nasal bridge with a distinctly different tip projection',
    hairGeometry: 'straight dense short hair with a higher forehead and visibly different hairline geometry',
    facialHair: 'neat short boxed beard concentrated on jaw and chin with a distinct moustache pattern'
  }
] as const;

const slotToPrompt = (slot: CompanionIdentitySlot): string =>
  `COMPANION ${slot.id} [${slot.spatialAnchor}]: ${slot.faceShape}; ${slot.jawGeometry}; ${slot.eyeGeometry}; ${slot.noseGeometry}; ${slot.hairGeometry}; ${slot.facialHair}.`;

export const buildCompanionIdentityPlan = (count: CompanionIdentityCount): CompanionIdentityPlan => {
  const slots = IDENTITY_SLOTS.slice(0, count);

  return {
    slots,
    referenceIsolationRule: 'REFERENCE-IDENTITY FIREWALL: The attached reference image applies EXCLUSIVELY to the PRIMARY SUBJECT. NEVER copy, interpolate, remix, inherit, average, or transfer the reference subject\'s skull shape, facial geometry, eyes, nose, jaw, hairline, hair texture, beard pattern, or other biometric traits into any companion.',
    pairwiseSeparationRule: 'PAIRWISE BIOMETRIC SEPARATION: Every pair of visible people must differ simultaneously in at least FOUR major biometric dimensions chosen from face shape, jaw width/chin geometry, eye shape/spacing, nose geometry, hair texture/hairline, and facial-hair pattern. No two people may share the same combination of those traits, and the companions must not read as siblings, twins, or variants of the primary subject.',
    spatialLockRule: 'SPATIAL IDENTITY LOCK: Companion A, Companion B, and Companion C identities are permanently tied to their assigned frame positions when present. Do not swap, blend, merge, average, or migrate facial traits between subjects across the image.',
    slotDescriptions: slots.map(slotToPrompt).join(' '),
    negativeConstraints: [
      'lookalike companions',
      'sibling-like faces',
      'shared facial geometry',
      'repeated jawline',
      'repeated nose shape',
      'repeated eye geometry',
      'facial feature averaging',
      'identity blending',
      'reference-face leakage into companions',
      'same hairline on multiple people',
      'same beard pattern on multiple people'
    ]
  };
};

export const lintCompanionIdentityText = (text: string, count: CompanionIdentityCount): string[] => {
  const warnings: string[] = [];
  if (!/reference image applies exclusively to the primary subject/i.test(text)) {
    warnings.push('companion-identity:missing-reference-firewall');
  }
  if (!/at least four major biometric dimensions/i.test(text)) {
    warnings.push('companion-identity:missing-pairwise-separation');
  }
  if (!/spatial identity lock/i.test(text)) {
    warnings.push('companion-identity:missing-spatial-lock');
  }

  for (const slot of IDENTITY_SLOTS.slice(0, count)) {
    if (!new RegExp(`COMPANION ${slot.id} \\[`, 'i').test(text)) {
      warnings.push(`companion-identity:missing-slot-${slot.id.toLowerCase()}`);
    }
  }

  return Array.from(new Set(warnings));
};
