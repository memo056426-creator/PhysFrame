import type { CaptureType } from './capabilities';

export type GroupSelfieCompanionCount = 1 | 2 | 3;

export interface GroupSelfieFacts {
  enabled: boolean;
  companionCount: GroupSelfieCompanionCount;
  captureType: CaptureType;
}

export interface GroupSelfieProfile {
  active: boolean;
  cameraDistance: string;
  lensDescriptor: string;
  captureMechanics: string;
  identityRules: string;
  anatomyRules: string;
  dynamicsRules: string;
  styleConstraints: string[];
}

const companionLabel = (count: GroupSelfieCompanionCount): string => {
  if (count === 1) return 'one companion';
  if (count === 2) return 'two companions';
  return 'three companions';
};

const buildDynamics = (count: GroupSelfieCompanionCount): string => {
  if (count === 1) {
    return 'The companion leans head and torso inward naturally toward the center of the frame, with an unsynchronized candid gaze that differs from the main subject.';
  }
  if (count === 2) {
    return 'Both companions lean inward organically to fit the wide selfie frame; one checks the phone-screen preview while the other looks toward the lens with a relaxed spontaneous expression. Their head tilt, shoulder height, gaze, and expression must remain naturally different.';
  }
  return 'All three companions lean their heads and torsos inward organically to fit the wide selfie frame; one checks the phone-screen preview, one looks toward the lens with a relaxed smile, and one is caught mid-laugh. Their head tilt, shoulder height, gaze direction, and expression must remain naturally unsynchronized.';
};

export const buildGroupSelfieProfile = (facts: GroupSelfieFacts): GroupSelfieProfile => {
  const active = facts.enabled && facts.captureType === 'front-selfie';
  if (!active) {
    return {
      active: false,
      cameraDistance: '',
      lensDescriptor: '',
      captureMechanics: '',
      identityRules: '',
      anatomyRules: '',
      dynamicsRules: '',
      styleConstraints: []
    };
  }

  const companions = companionLabel(facts.companionCount);
  return {
    active: true,
    cameraDistance: 'wide hand-held group-selfie arm reach (approx 45-65cm)',
    lensDescriptor: 'hand-held smartphone front camera with wide selfie perspective, approximately 21-24mm equivalent, with believable mild edge stretching only at the outer frame',
    captureMechanics: `Authentic hand-held front smartphone group selfie taken personally by the main subject in the foreground with ${companions} grouped beside and slightly behind him. The primary subject physically holds the phone with his own extended arm. STRICTLY NO external photographer, NO floating disembodied camera, and NO third-person viewpoint.`,
    identityRules: `PRIMARY SUBJECT ONLY: 100% strictly biometrically locked to the attached reference face, preserving identical facial bone structure, head geometry, eyes, nose, jawline, natural asymmetry, hairline, and facial-hair pattern. COMPANIONS: ${companions} must have completely distinct, unique, authentic Arab/Saudi male facial features with independent bone structures, varied jawlines, different eye/nose proportions, and diverse natural hair textures. STRICT ZERO CLONED FACES: zero duplicate faces, zero copy-paste facial geometry, zero twin-look syndrome.`,
    anatomyRules: 'Every visible hand, wrist, forearm, upper arm, and shoulder must be organically connected to a visible anatomically continuous torso. Zero detached floating limbs, zero mysterious hands resting on shoulders without a traceable attached arm, zero fused bodies, and anatomically correct finger count and joint continuity.',
    dynamicsRules: buildDynamics(facts.companionCount),
    styleConstraints: [
      'Main subject remains the unmistakable foreground shooter and biometric reference identity',
      'Companion identities must remain mutually distinct from the main subject and from each other',
      'No studio group-portrait arrangement or synchronized mannequin posing',
      'Keep believable depth ordering between foreground shooter and companions',
      'Preserve natural partial shoulder overlap and occlusion without merging bodies'
    ]
  };
};

export const lintGroupSelfieText = (text: string, facts: GroupSelfieFacts): string[] => {
  const warnings: string[] = [];
  if (facts.enabled && facts.captureType !== 'front-selfie') {
    warnings.push('group-selfie:requires-front-selfie');
    return warnings;
  }
  if (!facts.enabled) return warnings;

  if (!/personally by the main subject|main subject physically holds the phone/i.test(text)) {
    warnings.push('group-selfie:missing-shooter-ownership');
  }
  if (!/zero cloned faces|distinct, unique/i.test(text)) {
    warnings.push('group-selfie:missing-anti-cloning');
  }
  if (!/every visible hand|organically connected/i.test(text)) {
    warnings.push('group-selfie:missing-limb-integrity');
  }
  if (!/21-24mm|21-24 mm/i.test(text)) {
    warnings.push('group-selfie:missing-wide-lens-geometry');
  }
  return Array.from(new Set(warnings));
};
