export type PoseContactKind = 'none' | 'seated' | 'leaning';

export type PoseId =
  | 'standing-upright'
  | 'seated-behind-desk'
  | 'leaning-back-on-desk'
  | 'standing-steady'
  | 'walking-natural'
  | 'leaning-on-wall'
  | 'leaning-back-on-wall'
  | 'seated-on-chair'
  | 'relaxed-in-seat'
  | 'leaning-on-steering-wheel'
  | 'relaxed-on-sofa'
  | 'leaning-on-table'
  | 'seated-on-bed-edge'
  | 'semi-reclined'
  | 'standing-by-equipment'
  | 'seated-on-gym-bench'
  | 'holding-water-bottle';

export interface PoseDefinition {
  labelAR: string;
  contactKind: PoseContactKind;
}

export const POSE_DEFINITIONS: Readonly<Record<PoseId, PoseDefinition>> = Object.freeze({
  'standing-upright': { labelAR: 'واقف باستقامة', contactKind: 'none' },
  'seated-behind-desk': { labelAR: 'جالس خلف المكتب', contactKind: 'seated' },
  'leaning-back-on-desk': { labelAR: 'مستند بظهره على مكتب', contactKind: 'leaning' },
  'standing-steady': { labelAR: 'واقف بثبات', contactKind: 'none' },
  'walking-natural': { labelAR: 'يمشي بخطوات طبيعية', contactKind: 'none' },
  'leaning-on-wall': { labelAR: 'مستند على جدار', contactKind: 'leaning' },
  'leaning-back-on-wall': { labelAR: 'مستند بظهره على الجدار', contactKind: 'leaning' },
  'seated-on-chair': { labelAR: 'جالس على كرسي', contactKind: 'seated' },
  'relaxed-in-seat': { labelAR: 'جالس باسترخاء في المقعد', contactKind: 'seated' },
  'leaning-on-steering-wheel': { labelAR: 'مستند على المقود', contactKind: 'leaning' },
  'relaxed-on-sofa': { labelAR: 'مسترخٍ على الكنبة', contactKind: 'none' },
  'leaning-on-table': { labelAR: 'مستند على طاولة', contactKind: 'leaning' },
  'seated-on-bed-edge': { labelAR: 'جالس على حافة السرير', contactKind: 'seated' },
  'semi-reclined': { labelAR: 'نصف مستلقٍ', contactKind: 'none' },
  'standing-by-equipment': { labelAR: 'واقف بجانب الأجهزة', contactKind: 'none' },
  'seated-on-gym-bench': { labelAR: 'جالس على مقعد التمرين', contactKind: 'seated' },
  'holding-water-bottle': { labelAR: 'يحمل زجاجة ماء', contactKind: 'none' }
});

const POSE_BY_LABEL = new Map<string, PoseId>(
  Object.entries(POSE_DEFINITIONS).map(([id, definition]) => [definition.labelAR, id as PoseId])
);

export const isPoseId = (value: unknown): value is PoseId =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(POSE_DEFINITIONS, value);

export const resolvePoseId = (value: unknown): PoseId | '' => {
  if (value === '') return '';
  if (isPoseId(value)) return value;
  return typeof value === 'string' ? (POSE_BY_LABEL.get(value) ?? '') : '';
};

export const getPoseLabel = (id: PoseId | ''): string =>
  id ? POSE_DEFINITIONS[id].labelAR : '';

export const getPoseContactKind = (id: PoseId | ''): PoseContactKind =>
  id ? POSE_DEFINITIONS[id].contactKind : 'none';
