export type SelfiePoseModifierId =
  | 'front-natural'
  | 'three-quarter-right'
  | 'three-quarter-left'
  | 'shoulder-forward'
  | 'slight-forward-lean'
  | 'slight-back-lean'
  | 'subtle-head-tilt'
  | 'subtle-head-turn';

export type FreeHandPoseId = 'relaxed' | 'pocket' | 'thigh' | 'hair';

interface SelfiePoseDefinition {
  labelAR: string;
  prompt: string;
}

export const SELFIE_POSE_DEFINITIONS: Readonly<Record<SelfiePoseModifierId, SelfiePoseDefinition>> = Object.freeze({
  'front-natural': {
    labelAR: 'مواجه للكاميرا بشكل طبيعي',
    prompt: 'torso facing the phone naturally with relaxed shoulders and no exaggerated posing'
  },
  'three-quarter-right': {
    labelAR: 'الجسم مائل قليلًا لليمين',
    prompt: "torso rotated slightly to the subject's right in a natural three-quarter selfie stance"
  },
  'three-quarter-left': {
    labelAR: 'الجسم مائل قليلًا لليسار',
    prompt: "torso rotated slightly to the subject's left in a natural three-quarter selfie stance"
  },
  'shoulder-forward': {
    labelAR: 'كتف واحد أقرب للكاميرا',
    prompt: 'subtle three-quarter torso rotation with one shoulder naturally closer to the lens and the other slightly farther back'
  },
  'slight-forward-lean': {
    labelAR: 'ميل خفيف للأمام',
    prompt: 'upper body leaning very slightly toward the phone from the hips without neck craning or distorted perspective'
  },
  'slight-back-lean': {
    labelAR: 'ميل خفيف للخلف',
    prompt: 'upper body resting very slightly back while maintaining balanced posture and realistic body support'
  },
  'subtle-head-tilt': {
    labelAR: 'الرأس مائل قليلًا',
    prompt: 'head tilted only a few degrees to one side while preserving natural neck alignment'
  },
  'subtle-head-turn': {
    labelAR: 'الرأس ملتفت قليلًا بعيدًا عن العدسة',
    prompt: 'head rotated slightly away from the lens while the eyes continue to follow the selected gaze direction'
  }
});

export const FREE_HAND_POSE_DEFINITIONS: Readonly<Record<FreeHandPoseId, SelfiePoseDefinition>> = Object.freeze({
  relaxed: {
    labelAR: 'اليد الحرة بجانب الجسم',
    prompt: 'free hand resting naturally beside the body with relaxed fingers and no deliberate gesture'
  },
  pocket: {
    labelAR: 'اليد الحرة في الجيب',
    prompt: 'free hand resting naturally inside a trouser pocket with believable elbow angle and fabric tension at the pocket opening'
  },
  thigh: {
    labelAR: 'اليد الحرة على الفخذ',
    prompt: 'free hand resting naturally on the thigh with light contact pressure and relaxed fingers'
  },
  hair: {
    labelAR: 'اليد الحرة على الرأس/الشعر',
    prompt: 'free hand lightly touching the hair or side of the head with a believable elbow bend and relaxed fingers'
  }
});

export const SELFIE_POSE_OPTIONS = (Object.entries(SELFIE_POSE_DEFINITIONS) as Array<[
  SelfiePoseModifierId,
  SelfiePoseDefinition
]>).map(([id, definition]) => ({ id, labelAR: definition.labelAR }));

export const FREE_HAND_POSE_OPTIONS = (Object.entries(FREE_HAND_POSE_DEFINITIONS) as Array<[
  FreeHandPoseId,
  SelfiePoseDefinition
]>).map(([id, definition]) => ({ id, labelAR: definition.labelAR }));

export const isSelfiePoseModifierId = (value: unknown): value is SelfiePoseModifierId =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(SELFIE_POSE_DEFINITIONS, value);

export const isFreeHandPoseId = (value: unknown): value is FreeHandPoseId =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(FREE_HAND_POSE_DEFINITIONS, value);

export const getSelfiePosePrompt = (id: SelfiePoseModifierId): string => SELFIE_POSE_DEFINITIONS[id].prompt;

export const getFreeHandPosePrompt = (id: FreeHandPoseId): string => FREE_HAND_POSE_DEFINITIONS[id].prompt;
