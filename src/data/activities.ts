export type ActivityId =
  | 'military-office-work'
  | 'short-break'
  | 'on-duty'
  | 'standing-proud'
  | 'walking-calmly'
  | 'standing-natural'
  | 'waiting'
  | 'seated-at-cafe'
  | 'parked-behind-wheel'
  | 'passenger-seat'
  | 'seated-calm-in-car'
  | 'seated-on-sofa'
  | 'drinking-coffee'
  | 'using-phone'
  | 'seated'
  | 'relaxing'
  | 'pre-workout'
  | 'rest-between-sets'
  | 'post-workout';

export const ACTIVITY_LABELS: Readonly<Record<ActivityId, string>> = Object.freeze({
  'military-office-work': 'عمل مكتبي',
  'short-break': 'استراحة قصيرة',
  'on-duty': 'مناوبة',
  'standing-proud': 'واقف بثبات واعتزاز',
  'walking-calmly': 'يمشي بهدوء',
  'standing-natural': 'واقف بشكل طبيعي',
  'waiting': 'ينتظر',
  'seated-at-cafe': 'جالس في المقهى',
  'parked-behind-wheel': 'خلف المقود والسيارة متوقفة',
  'passenger-seat': 'جالس في مقعد الراكب',
  'seated-calm-in-car': 'جالس بهدوء داخل السيارة',
  'seated-on-sofa': 'جالس على الكنبة',
  'drinking-coffee': 'يشرب قهوة',
  'using-phone': 'يستخدم الهاتف',
  'seated': 'جالس',
  'relaxing': 'مسترخٍ',
  'pre-workout': 'قبل التمرين',
  'rest-between-sets': 'يستريح بين الجولات',
  'post-workout': 'بعد التمرين'
});

const ACTIVITY_BY_LABEL = new Map<string, ActivityId>(
  Object.entries(ACTIVITY_LABELS).map(([id, label]) => [label, id as ActivityId])
);

export const isActivityId = (value: unknown): value is ActivityId =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(ACTIVITY_LABELS, value);

export const resolveActivityId = (value: unknown): ActivityId | '' => {
  if (value === '') return '';
  if (isActivityId(value)) return value;
  return typeof value === 'string' ? (ACTIVITY_BY_LABEL.get(value) ?? '') : '';
};

export const getActivityLabel = (id: ActivityId | ''): string =>
  id ? ACTIVITY_LABELS[id] : '';
